"""
Reranker service using BAAI/bge-reranker-large.

Takes a query + list of candidate chunks and returns them sorted by
cross-encoder relevance score (0–1). Scores above 0.5 are considered relevant.
"""
from __future__ import annotations
import asyncio
from dataclasses import dataclass
from functools import lru_cache

from app.utils.logger import get_logger
from app.utils.exceptions import RAGBaseException

logger = get_logger(__name__)

_RERANKER_MODEL = "BAAI/bge-reranker-large"


@dataclass
class RankedChunk:
    """A chunk with its cross-encoder reranking score."""
    chunk_id: str
    text: str
    document_name: str
    page: int
    source: str
    document_id: str
    relevance_score: float  # Cross-encoder score 0–1
    original_retrieval_score: float  # Original cosine similarity from Pinecone


class RerankerService:
    """
    Wraps BAAI/bge-reranker-large for cross-encoder reranking.

    The reranker scores each (query, chunk) pair independently,
    giving much more accurate relevance than cosine similarity alone.
    """

    def __init__(self) -> None:
        self._model = None

    def _load_model(self) -> None:
        """Load the reranker model. Called once at startup."""
        if self._model is not None:
            return
        try:
            from FlagEmbedding import FlagReranker
            logger.info("Loading reranker model", model=_RERANKER_MODEL)
            self._model = FlagReranker(_RERANKER_MODEL, use_fp16=True)
            logger.info("Reranker model loaded", model=_RERANKER_MODEL)
        except ImportError:
            logger.warning("FlagEmbedding not available, using sentence-transformers CrossEncoder")
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(_RERANKER_MODEL)
        except Exception as exc:
            logger.error("Reranker load failed", error=str(exc))
            raise RAGBaseException(f"Reranker model failed to load: {exc}")

    async def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_n: int = 5,
    ) -> list[RankedChunk]:
        """
        Rerank retrieved chunks by cross-encoder relevance.

        Args:
            query : The search query
            chunks: list of dicts with keys: chunk_id, text, document_name, page, etc.
            top_n : Number of top chunks to return

        Returns:
            Sorted list of RankedChunk (best first), length = min(top_n, len(chunks))
        """
        if not chunks:
            return []

        return await asyncio.get_event_loop().run_in_executor(
            None, self._rerank_sync, query, chunks, top_n
        )

    def _rerank_sync(
        self,
        query: str,
        chunks: list[dict],
        top_n: int,
    ) -> list[RankedChunk]:
        self._load_model()

        pairs = [[query, chunk.get("text", "")] for chunk in chunks]

        try:
            if hasattr(self._model, "compute_score"):
                # FlagEmbedding path
                scores = self._model.compute_score(pairs, normalize=True)
            else:
                # CrossEncoder path (sentence-transformers)
                import numpy as np
                raw_scores = self._model.predict(pairs)
                # Normalize with sigmoid
                scores = (1 / (1 + np.exp(-raw_scores))).tolist()

            if not isinstance(scores, list):
                scores = [float(scores)]

            ranked: list[RankedChunk] = []
            for chunk, score in zip(chunks, scores):
                ranked.append(
                    RankedChunk(
                        chunk_id=chunk.get("chunk_id", ""),
                        text=chunk.get("text", ""),
                        document_name=chunk.get("document_name", ""),
                        page=int(chunk.get("page", 0)),
                        source=chunk.get("source", ""),
                        document_id=chunk.get("document_id", ""),
                        relevance_score=float(score),
                        original_retrieval_score=float(
                            chunk.get("score", chunk.get("hybrid_score", 0.0))
                        ),
                    )
                )

            ranked.sort(key=lambda x: x.relevance_score, reverse=True)
            logger.info(
                "Reranking complete",
                input_chunks=len(chunks),
                top_n=top_n,
                top_score=ranked[0].relevance_score if ranked else 0,
            )
            return ranked[:top_n]

        except Exception as exc:
            logger.error("Reranking failed", error=str(exc))
            raise RAGBaseException(f"Reranking failed: {exc}")


@lru_cache(maxsize=1)
def get_reranker_service() -> RerankerService:
    """Return the singleton RerankerService instance."""
    svc = RerankerService()
    svc._load_model()
    return svc
