"""
Integration test for the Self-Healing workflow.
Tests that the LangGraph enforces max retries and routes correctly.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestHealingWorkflow:
    """Tests that the healing loop respects max retries from config."""

    @pytest.mark.asyncio
    async def test_healing_stops_at_max_retries(self):
        """
        If context is always insufficient, healing should stop at MAX_RETRIES
        and proceed to generation with whatever context is available.
        """
        from app.config import get_settings
        settings = get_settings()
        max_retries = settings.max_healing_retries

        call_count = 0

        async def mock_evaluate(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return {"score": 0.30, "needs_retry": True, "reason": "poor context"}

        with patch("app.workflows.rag_graph.get_context_evaluator") as mock_eval_cls, \
             patch("app.workflows.rag_graph.get_query_analyzer") as mock_qa_cls, \
             patch("app.workflows.rag_graph.get_retrieval_agent") as mock_ret_cls, \
             patch("app.workflows.rag_graph.get_reranker_agent") as mock_rr_cls, \
             patch("app.workflows.rag_graph.get_healing_agent") as mock_heal_cls, \
             patch("app.workflows.rag_graph.get_generator_agent") as mock_gen_cls, \
             patch("app.workflows.rag_graph.get_hallucination_agent") as mock_hall_cls, \
             patch("app.workflows.rag_graph.get_confidence_agent") as mock_conf_cls:

            # Query Analyzer
            qa = MagicMock()
            qa.analyze = AsyncMock(return_value={
                "is_ambiguous": False,
                "improved_query": "test improved",
                "sub_queries": ["test sub"],
                "issues": []
            })
            mock_qa_cls.return_value = qa

            # Retrieval
            ret = MagicMock()
            ret.retrieve = AsyncMock(return_value=[])
            mock_ret_cls.return_value = ret

            # Reranker
            rr = MagicMock()
            rr.rerank = AsyncMock(return_value=[])
            mock_rr_cls.return_value = rr

            # Context Evaluator — always bad
            eval_agent = MagicMock()
            eval_agent.evaluate = AsyncMock(side_effect=mock_evaluate)
            mock_eval_cls.return_value = eval_agent

            # Healing
            heal = MagicMock()
            heal.heal = AsyncMock(return_value={
                "rewritten_query": "healed query",
                "sub_queries": ["healed sub"],
                "top_k_multiplier": 1.5,
                "remove_filters": False,
                "strategy": "rewrite"
            })
            mock_heal_cls.return_value = heal

            # Generator
            gen = MagicMock()
            gen.generate = AsyncMock(return_value={
                "answer": "Insufficient information found.",
                "cited_chunks": [],
                "context_used": ""
            })
            mock_gen_cls.return_value = gen

            # Hallucination
            hall = MagicMock()
            hall.verify = AsyncMock(return_value={
                "is_grounded": True,
                "grounding_score": 1.0,
                "unsupported_claims": [],
                "contradictions": [],
                "missing_citations": [],
                "reason": "fallback pass"
            })
            mock_hall_cls.return_value = hall

            # Confidence
            conf = MagicMock()
            conf.compute = AsyncMock(return_value={
                "confidence": 0.30,
                "retrieval_score": 0.0,
                "context_score": 0.30,
                "grounding_score": 1.0,
                "citation_coverage": 0.0
            })
            mock_conf_cls.return_value = conf

            from app.workflows.rag_graph import RAGPipeline
            pipeline = RAGPipeline()
            final = await pipeline.run("test query")

            # Healing was called max_retries times
            assert heal.heal.call_count == max_retries
            # Final state has an answer (even if fallback)
            assert final.get("answer") is not None
            # Retry count matches max
            assert final.get("retry_count") == max_retries

    @pytest.mark.asyncio
    async def test_no_healing_when_context_sufficient(self):
        """When context score is above threshold, healing should NOT be triggered."""
        with patch("app.workflows.rag_graph.get_context_evaluator") as mock_eval_cls, \
             patch("app.workflows.rag_graph.get_query_analyzer") as mock_qa_cls, \
             patch("app.workflows.rag_graph.get_retrieval_agent") as mock_ret_cls, \
             patch("app.workflows.rag_graph.get_reranker_agent") as mock_rr_cls, \
             patch("app.workflows.rag_graph.get_healing_agent") as mock_heal_cls, \
             patch("app.workflows.rag_graph.get_generator_agent") as mock_gen_cls, \
             patch("app.workflows.rag_graph.get_hallucination_agent") as mock_hall_cls, \
             patch("app.workflows.rag_graph.get_confidence_agent") as mock_conf_cls:

            qa = MagicMock()
            qa.analyze = AsyncMock(return_value={
                "is_ambiguous": False,
                "improved_query": "good query",
                "sub_queries": ["variation"],
                "issues": []
            })
            mock_qa_cls.return_value = qa

            ret = MagicMock()
            ret.retrieve = AsyncMock(return_value=[{"chunk_id": "c1", "text": "content", "score": 0.9}])
            mock_ret_cls.return_value = ret

            rr = MagicMock()
            from dataclasses import dataclass
            @dataclass
            class MC:
                chunk_id: str = "c1"
                text: str = "content"
                document_name: str = "doc.pdf"
                page: int = 1
                source: str = "doc.pdf"
                document_id: str = "d1"
                relevance_score: float = 0.90
                original_retrieval_score: float = 0.90
            rr.rerank = AsyncMock(return_value=[MC()])
            mock_rr_cls.return_value = rr

            eval_agent = MagicMock()
            eval_agent.evaluate = AsyncMock(return_value={
                "score": 0.88, "needs_retry": False, "reason": "good context"
            })
            mock_eval_cls.return_value = eval_agent

            heal = MagicMock()
            mock_heal_cls.return_value = heal

            gen = MagicMock()
            gen.generate = AsyncMock(return_value={
                "answer": "Answer from context [doc.pdf, Page 1].",
                "cited_chunks": ["c1"],
                "context_used": "content"
            })
            mock_gen_cls.return_value = gen

            hall = MagicMock()
            hall.verify = AsyncMock(return_value={
                "is_grounded": True,
                "grounding_score": 0.95,
                "unsupported_claims": [],
                "contradictions": [],
                "missing_citations": [],
                "reason": "fully grounded"
            })
            mock_hall_cls.return_value = hall

            conf = MagicMock()
            conf.compute = AsyncMock(return_value={
                "confidence": 0.91,
                "retrieval_score": 0.90,
                "context_score": 0.88,
                "grounding_score": 0.95,
                "citation_coverage": 0.80
            })
            mock_conf_cls.return_value = conf

            from app.workflows.rag_graph import RAGPipeline
            pipeline = RAGPipeline()
            final = await pipeline.run("good query about transformers")

            # Healing agent should NOT have been called
            heal.heal.assert_not_called()
            assert final["retry_count"] == 0
            assert final["confidence"] > 0.70
