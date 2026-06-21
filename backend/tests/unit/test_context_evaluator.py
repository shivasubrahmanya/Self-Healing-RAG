"""
Unit tests for Context Evaluator Agent.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from dataclasses import dataclass


@dataclass
class MockRankedChunk:
    chunk_id: str
    text: str
    document_name: str
    page: int
    source: str
    document_id: str
    relevance_score: float
    original_retrieval_score: float


def make_chunks(scores: list[float]) -> list:
    return [
        MockRankedChunk(
            chunk_id=f"chunk_{i}",
            text=f"This is context text about topic {i}. It contains relevant information.",
            document_name=f"doc_{i}.pdf",
            page=i,
            source=f"doc_{i}.pdf",
            document_id=f"doc_{i}",
            relevance_score=score,
            original_retrieval_score=score,
        )
        for i, score in enumerate(scores)
    ]


@pytest.fixture
def mock_llm():
    with patch("app.agents.context_evaluator.get_llm_service") as mock:
        llm = AsyncMock()
        mock.return_value = llm
        yield llm


class TestContextEvaluatorAgent:

    @pytest.mark.asyncio
    async def test_empty_chunks_triggers_retry(self, mock_llm):
        from app.agents.context_evaluator import ContextEvaluatorAgent
        agent = ContextEvaluatorAgent()
        result = await agent.evaluate(query="test query", ranked_chunks=[])
        assert result["needs_retry"] is True
        assert result["score"] == 0.0

    @pytest.mark.asyncio
    async def test_high_relevance_chunks_pass(self, mock_llm):
        mock_llm.generate_json = AsyncMock(return_value={
            "score": 0.92,
            "needs_retry": False,
            "reason": "Context fully covers the query"
        })
        chunks = make_chunks([0.95, 0.92, 0.88, 0.85, 0.82])

        from app.agents.context_evaluator import ContextEvaluatorAgent
        agent = ContextEvaluatorAgent()
        result = await agent.evaluate(query="explain transformers", ranked_chunks=chunks)

        assert result["score"] >= 0.70
        assert result["needs_retry"] is False

    @pytest.mark.asyncio
    async def test_low_relevance_chunks_trigger_retry(self, mock_llm):
        mock_llm.generate_json = AsyncMock(return_value={
            "score": 0.30,
            "needs_retry": True,
            "reason": "Context is unrelated to the query"
        })
        chunks = make_chunks([0.20, 0.15, 0.10])

        from app.agents.context_evaluator import ContextEvaluatorAgent
        agent = ContextEvaluatorAgent()
        result = await agent.evaluate(query="explain transformers", ranked_chunks=chunks)

        assert result["needs_retry"] is True
        assert result["score"] < 0.70

    @pytest.mark.asyncio
    async def test_threshold_boundary(self, mock_llm):
        """Score exactly at threshold (0.70) should NOT trigger retry."""
        mock_llm.generate_json = AsyncMock(return_value={
            "score": 0.70,
            "needs_retry": False,
            "reason": "Borderline sufficient"
        })
        chunks = make_chunks([0.70, 0.70, 0.70])

        from app.agents.context_evaluator import ContextEvaluatorAgent
        agent = ContextEvaluatorAgent()
        result = await agent.evaluate(query="test", ranked_chunks=chunks)

        assert result["needs_retry"] is False
