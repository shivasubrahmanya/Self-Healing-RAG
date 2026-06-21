"""
Pinecone service — manages index lifecycle, upsert, and hybrid retrieval.

Index schema (from database.md):
  name      : self-healing-rag
  dimensions: 1024
  metric    : cosine

Metadata schema:
  document_id   : str
  document_name : str
  page          : int
  chunk_id      : str
  source        : str
  created_at    : str (ISO-8601)
  text          : str  (stored for retrieval display)
"""
from __future__ import annotations
import asyncio
from datetime import datetime
from functools import lru_cache
from typing import Optional

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.exceptions import PineconeConnectionError, RetrievalError

logger = get_logger(__name__)
settings = get_settings()


class PineconeService:
    """
    Wraps the Pinecone v3 client.
    Provides upsert, dense query, and hybrid query operations.
    """

    def __init__(self) -> None:
        self._index = None
        self._pc = None

    def initialize(self) -> None:
        """Connect to Pinecone and ensure the index exists. Called at app startup."""
        try:
            from pinecone import Pinecone, ServerlessSpec
            logger.info("Connecting to Pinecone", index=settings.pinecone_index)
            self._pc = Pinecone(api_key=settings.pinecone_api_key)

            existing = [i.name for i in self._pc.list_indexes()]
            if settings.pinecone_index not in existing:
                logger.info("Creating Pinecone index", index=settings.pinecone_index)
                self._pc.create_index(
                    name=settings.pinecone_index,
                    dimension=1024,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region=settings.pinecone_env,
                    ),
                )
            self._index = self._pc.Index(settings.pinecone_index)
            stats = self._index.describe_index_stats()
            logger.info(
                "Pinecone connected",
                total_vectors=stats.total_vector_count,
                namespaces=list(stats.namespaces.keys()),
            )
        except Exception as exc:
            logger.error("Pinecone initialization failed", error=str(exc))
            raise PineconeConnectionError()

    def _ensure_connected(self) -> None:
        if self._index is None:
            self.initialize()

    async def upsert_chunks(
        self,
        chunks: list[dict],
        embeddings: list[list[float]],
        namespace: str = "default",
    ) -> int:
        """
        Upsert chunks with their embeddings into Pinecone.

        Args:
            chunks   : list of dicts with metadata (chunk_id, document_id, etc.)
            embeddings: corresponding 1024-dim vectors
            namespace: Pinecone namespace (default = "default")

        Returns:
            Number of vectors upserted.
        """
        return await asyncio.get_event_loop().run_in_executor(
            None, self._upsert_sync, chunks, embeddings, namespace
        )

    def _upsert_sync(
        self,
        chunks: list[dict],
        embeddings: list[list[float]],
        namespace: str,
    ) -> int:
        self._ensure_connected()
        vectors = []
        for chunk, embedding in zip(chunks, embeddings):
            vectors.append(
                {
                    "id": chunk["chunk_id"],
                    "values": embedding,
                    "metadata": {
                        "document_id": chunk.get("document_id", ""),
                        "document_name": chunk.get("document_name", ""),
                        "page": chunk.get("page", 0),
                        "chunk_id": chunk["chunk_id"],
                        "source": chunk.get("source", ""),
                        "created_at": chunk.get(
                            "created_at", datetime.utcnow().isoformat()
                        ),
                        "text": chunk.get("text", ""),
                    },
                }
            )

        # Upsert in batches of 100 (Pinecone limit)
        batch_size = 100
        total_upserted = 0
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i : i + batch_size]
            result = self._index.upsert(vectors=batch, namespace=namespace)
            total_upserted += result.upserted_count

        logger.info("Upserted chunks to Pinecone", count=total_upserted, namespace=namespace)
        return total_upserted

    async def dense_query(
        self,
        vector: list[float],
        top_k: int = 20,
        filter: Optional[dict] = None,
        namespace: str = "default",
    ) -> list[dict]:
        """
        Perform a dense vector similarity search.

        Returns list of match dicts with id, score, and metadata.
        """
        return await asyncio.get_event_loop().run_in_executor(
            None, self._dense_query_sync, vector, top_k, filter, namespace
        )

    def _dense_query_sync(
        self,
        vector: list[float],
        top_k: int,
        filter: Optional[dict],
        namespace: str,
    ) -> list[dict]:
        self._ensure_connected()
        try:
            response = self._index.query(
                vector=vector,
                top_k=top_k,
                include_metadata=True,
                filter=filter,
                namespace=namespace,
            )
            return [
                {
                    "chunk_id": m.id,
                    "score": float(m.score),
                    "text": m.metadata.get("text", ""),
                    "document_name": m.metadata.get("document_name", ""),
                    "page": int(m.metadata.get("page", 0)),
                    "document_id": m.metadata.get("document_id", ""),
                    "source": m.metadata.get("source", ""),
                    "created_at": m.metadata.get("created_at", ""),
                }
                for m in response.matches
            ]
        except Exception as exc:
            logger.error("Dense query failed", error=str(exc))
            raise RetrievalError(f"Pinecone dense query failed: {exc}")

    async def hybrid_query(
        self,
        dense_vector: list[float],
        query_text: str,
        top_k: int = 20,
        alpha: float = 0.7,
        filter: Optional[dict] = None,
        namespace: str = "default",
    ) -> list[dict]:
        """
        Hybrid search: weighted combination of dense + keyword scores.
        alpha = weight for dense search (1-alpha = keyword weight).
        Falls back to dense-only if sparse not supported.
        """
        # For Pinecone Serverless, use dense query (sparse requires dedicated pod)
        # We simulate hybrid by running dense and using BM25-style text overlap scoring
        dense_results = await self.dense_query(
            vector=dense_vector,
            top_k=top_k * 2,  # Over-fetch then re-score
            filter=filter,
            namespace=namespace,
        )

        # Keyword re-scoring (simple term overlap boost)
        query_terms = set(query_text.lower().split())
        for result in dense_results:
            text_terms = set(result["text"].lower().split())
            overlap = len(query_terms & text_terms) / max(len(query_terms), 1)
            # Weighted combination
            result["hybrid_score"] = alpha * result["score"] + (1 - alpha) * overlap

        # Sort by hybrid score and return top_k
        dense_results.sort(key=lambda x: x["hybrid_score"], reverse=True)
        return dense_results[:top_k]

    async def delete_document(self, document_id: str, namespace: str = "default") -> None:
        """Delete all chunks belonging to a document."""
        await asyncio.get_event_loop().run_in_executor(
            None, self._delete_sync, document_id, namespace
        )

    def _delete_sync(self, document_id: str, namespace: str) -> None:
        self._ensure_connected()
        self._index.delete(
            filter={"document_id": {"$eq": document_id}},
            namespace=namespace,
        )
        logger.info("Deleted document from Pinecone", document_id=document_id)

    async def get_index_stats(self) -> dict:
        """Return index statistics."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self._stats_sync
        )

    def _stats_sync(self) -> dict:
        self._ensure_connected()
        stats = self._index.describe_index_stats()
        return {
            "total_vectors": stats.total_vector_count,
            "namespaces": {k: v.vector_count for k, v in stats.namespaces.items()},
        }


@lru_cache(maxsize=1)
def get_pinecone_service() -> PineconeService:
    """Return the singleton PineconeService instance."""
    svc = PineconeService()
    return svc
