"""
Agent 3: Reranker Agent

Responsibilities (from agents.md):
  - Rerank retrieved chunks using cross-encoder
  - Return best context (top 5 per PDF PRD)

Input : top-20 chunks from retrieval
Output: top-5 RankedChunk objects sorted by relevance score
"""
from __future__ import annotations

from app.config import get_settings
from app.services.reranker_service import RankedChunk, get_reranker_service
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class RerankerAgent:
    """
    Wraps RerankerService to rerank retrieved chunks.

    Retrieval gives us 20 candidates via approximate nearest-neighbor search.
    The cross-encoder reranker precisely scores each (query, chunk) pair,
    dramatically improving the quality of the final context window.
    """

    def __init__(self) -> None:
        self._reranker_svc = get_reranker_service()

    async def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_n: int | None = None,
    ) -> list[RankedChunk]:
        """
        Rerank candidate chunks for the given query.

        Args:
            query : The effective search query
            chunks: list of chunk dicts from RetrievalAgent
            top_n : Number of top chunks to return (default from settings)

        Returns:
            Sorted list of RankedChunk objects (best first)
        """
        top_n = top_n or settings.top_k_rerank
        logger.info("Reranking chunks", input_count=len(chunks), top_n=top_n)

        if not chunks:
            logger.warning("No chunks to rerank")
            return []

        ranked = await self._reranker_svc.rerank(
            query=query,
            chunks=chunks,
            top_n=top_n,
        )

        logger.info(
            "Reranking done",
            output_count=len(ranked),
            top_score=ranked[0].relevance_score if ranked else 0.0,
        )
        return ranked


def get_reranker_agent() -> RerankerAgent:
    """Return a RerankerAgent instance."""
    return RerankerAgent()
