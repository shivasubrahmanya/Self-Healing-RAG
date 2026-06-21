"""
Unit tests for Query Analyzer Agent.
"""
import pytest
from unittest.mock import AsyncMock, patch


@pytest.fixture
def mock_llm():
    with patch("app.agents.query_analyzer.get_llm_service") as mock:
        llm = AsyncMock()
        mock.return_value = llm
        yield llm


class TestQueryAnalyzerAgent:

    @pytest.mark.asyncio
    async def test_analyze_returns_required_fields(self, mock_llm):
        mock_llm.generate_json = AsyncMock(return_value={
            "is_ambiguous": False,
            "improved_query": "What is self-attention in transformer models?",
            "sub_queries": [
                "self-attention mechanism transformer",
                "multi-head attention neural networks",
                "attention weights in transformers"
            ],
            "issues": []
        })

        from app.agents.query_analyzer import QueryAnalyzerAgent
        agent = QueryAnalyzerAgent()
        result = await agent.analyze("attention in transformers")

        assert "is_ambiguous" in result
        assert "improved_query" in result
        assert "sub_queries" in result
        assert isinstance(result["sub_queries"], list)
        assert len(result["sub_queries"]) > 0

    @pytest.mark.asyncio
    async def test_short_query_flagged_as_ambiguous(self, mock_llm):
        mock_llm.generate_json = AsyncMock(return_value={
            "is_ambiguous": True,
            "improved_query": "Explain the concept of RAG in AI systems",
            "sub_queries": ["RAG architecture", "retrieval augmented generation"],
            "issues": ["too short"]
        })

        from app.agents.query_analyzer import QueryAnalyzerAgent
        agent = QueryAnalyzerAgent()
        result = await agent.analyze("RAG")

        assert result["is_ambiguous"] is True
        assert len(result["sub_queries"]) >= 1

    @pytest.mark.asyncio
    async def test_fallback_on_llm_failure(self, mock_llm):
        from app.utils.exceptions import LLMError
        mock_llm.generate_json = AsyncMock(side_effect=LLMError("timeout"))

        from app.agents.query_analyzer import QueryAnalyzerAgent
        agent = QueryAnalyzerAgent()
        # Should not raise — uses fallback
        result = await agent.analyze("how does BERT work")

        assert "improved_query" in result
        assert result["improved_query"] == "how does BERT work"

    @pytest.mark.asyncio
    async def test_sub_queries_capped_at_5(self, mock_llm):
        mock_llm.generate_json = AsyncMock(return_value={
            "is_ambiguous": False,
            "improved_query": "test query",
            "sub_queries": ["q1", "q2", "q3", "q4", "q5", "q6", "q7"],
            "issues": []
        })

        from app.agents.query_analyzer import QueryAnalyzerAgent
        agent = QueryAnalyzerAgent()
        result = await agent.analyze("test query")

        assert len(result["sub_queries"]) <= 5
