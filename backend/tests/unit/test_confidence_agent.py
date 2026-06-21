"""
Unit tests for Confidence Agent.
"""
import pytest
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


class TestConfidenceAgent:

    @pytest.mark.asyncio
    async def test_confidence_between_0_and_1(self):
        from app.agents.confidence_agent import ConfidenceAgent
        agent = ConfidenceAgent()
        chunks = [
            MockRankedChunk("c1", "text", "doc.pdf", 1, "doc.pdf", "d1", 0.85, 0.85)
        ]
        result = await agent.compute(
            ranked_chunks=chunks,
            context_score=0.80,
            grounding_score=0.90,
            cited_chunk_ids=["c1"],
            answer="The answer mentions doc.pdf",
        )
        assert 0.0 <= result["confidence"] <= 1.0

    @pytest.mark.asyncio
    async def test_high_inputs_produce_high_confidence(self):
        from app.agents.confidence_agent import ConfidenceAgent
        agent = ConfidenceAgent()
        chunks = [
            MockRankedChunk(f"c{i}", "text about topic", "doc.pdf", i, "doc.pdf", "d1", 0.95, 0.95)
            for i in range(5)
        ]
        result = await agent.compute(
            ranked_chunks=chunks,
            context_score=0.95,
            grounding_score=0.95,
            cited_chunk_ids=[f"c{i}" for i in range(5)],
            answer="The answer clearly cites doc.pdf on every claim.",
        )
        assert result["confidence"] >= 0.85

    @pytest.mark.asyncio
    async def test_no_chunks_produces_zero_confidence(self):
        from app.agents.confidence_agent import ConfidenceAgent
        agent = ConfidenceAgent()
        result = await agent.compute(
            ranked_chunks=[],
            context_score=0.0,
            grounding_score=0.0,
            cited_chunk_ids=[],
            answer="",
        )
        assert result["confidence"] == 0.0

    @pytest.mark.asyncio
    async def test_breakdown_keys_present(self):
        from app.agents.confidence_agent import ConfidenceAgent
        agent = ConfidenceAgent()
        chunks = [
            MockRankedChunk("c1", "text", "doc.pdf", 1, "doc.pdf", "d1", 0.7, 0.7)
        ]
        result = await agent.compute(
            ranked_chunks=chunks,
            context_score=0.7,
            grounding_score=0.7,
            cited_chunk_ids=["c1"],
            answer="doc.pdf",
        )
        assert "retrieval_score" in result
        assert "context_score" in result
        assert "grounding_score" in result
        assert "citation_coverage" in result

    @pytest.mark.asyncio
    async def test_weights_sum_to_confidence(self):
        """Verify the weighted formula is applied correctly."""
        from app.agents.confidence_agent import ConfidenceAgent, WEIGHTS
        agent = ConfidenceAgent()
        chunks = [MockRankedChunk("c1", "text", "doc.pdf", 1, "doc.pdf", "d1", 0.8, 0.8)]
        result = await agent.compute(
            ranked_chunks=chunks,
            context_score=0.75,
            grounding_score=0.90,
            cited_chunk_ids=["c1"],
            answer="doc.pdf",
        )
        expected = (
            WEIGHTS["retrieval"] * 0.8
            + WEIGHTS["context"] * 0.75
            + WEIGHTS["grounding"] * 0.90
            + WEIGHTS["citation"] * result["citation_coverage"]
        )
        assert abs(result["confidence"] - round(expected, 4)) < 0.01
