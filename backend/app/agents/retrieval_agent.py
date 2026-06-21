"""
Agent 2: Retrieval Agent

Responsibilities (from agents.md):
  - Retrieve top-k chunks (top_k=20 per PDF PRD)
  - Perform hybrid search (dense + keyword re-scoring)
  - Support multi-query retrieval (fan-out + deduplicate)

Works with PineconeService and EmbeddingService.
"""
from __future__ import annotations

from app.config import get_settings
from app.services.embedding_service import get_embedding_service
from app.services.pinecone_service import get_pinecone_service
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class RetrievalAgent:
    """
    Executes hybrid multi-query retrieval against Pinecone.

    For each query in the set, embeds it and runs a hybrid search.
    Results from all queries are merged and deduplicated by chunk_id,
    keeping the highest score for each chunk.
    """

    def __init__(self) -> None:
        self._embedding_svc = get_embedding_service()
        self._pinecone_svc = get_pinecone_service()

    async def retrieve(
        self,
        queries: list[str],
        top_k: int | None = None,
        metadata_filter: dict | None = None,
    ) -> list[dict]:
        """
        Perform multi-query hybrid retrieval.

        Args:
            queries        : list of query strings (original + sub-queries)
            top_k          : chunks to retrieve per query (default from settings)
            metadata_filter: optional Pinecone metadata filter dict

        Returns:
            Deduplicated list of chunk dicts, sorted by score descending.
            Maximum total = top_k * len(queries), deduplicated.
        """
        top_k = top_k or settings.top_k_retrieval
        logger.info("Starting retrieval", query_count=len(queries), top_k=top_k)

        all_chunks: dict[str, dict] = {}  # chunk_id → best chunk

        for query in queries:
            try:
                # 1. Embed query
                vector = await self._embedding_svc.embed_query(query)

                # 2. Hybrid search
                results = await self._pinecone_svc.hybrid_query(
                    dense_vector=vector,
                    query_text=query,
                    top_k=top_k,
                    filter=metadata_filter,
                )

                # 3. Merge — keep best score per chunk_id
                for chunk in results:
                    cid = chunk["chunk_id"]
                    existing_score = all_chunks.get(cid, {}).get(
                        "hybrid_score", chunk.get("hybrid_score", 0)
                    )
                    new_score = chunk.get("hybrid_score", chunk.get("score", 0))
                    if cid not in all_chunks or new_score > existing_score:
                        all_chunks[cid] = chunk

            except Exception as exc:
                logger.warning("Query retrieval failed, skipping", query=query, error=str(exc))
                continue

        # Sort by hybrid_score descending
        sorted_chunks = sorted(
            all_chunks.values(),
            key=lambda c: c.get("hybrid_score", c.get("score", 0)),
            reverse=True,
        )

        logger.info(
            "Retrieval complete",
            total_unique_chunks=len(sorted_chunks),
        )
        return sorted_chunks


def get_retrieval_agent() -> RetrievalAgent:
    """Return a RetrievalAgent instance."""
    return RetrievalAgent()
