"""
LangGraph Self-Healing RAG Workflow

State machine that orchestrates all 8 agents in a conditional pipeline.

Flow:
  analyze_query
      ↓
  retrieve
      ↓
  rerank
      ↓
  evaluate_context ─── needs_retry AND retries < 3 ──→ heal ──→ retrieve (loop)
      ↓ (context good OR retries exhausted)
  generate
      ↓
  verify_hallucination ─── not grounded ──→ generate (regenerate once)
      ↓
  score_confidence
      ↓
  END

RAGState is the shared state object passed between all nodes.
"""
from __future__ import annotations

from typing import Any, Optional, TypedDict, Annotated
import operator

from langgraph.graph import StateGraph, END

from app.agents.query_analyzer import get_query_analyzer
from app.agents.retrieval_agent import get_retrieval_agent
from app.agents.reranker_agent import get_reranker_agent
from app.agents.context_evaluator import get_context_evaluator
from app.agents.healing_agent import get_healing_agent
from app.agents.generator_agent import get_generator_agent
from app.agents.hallucination_agent import get_hallucination_agent
from app.agents.confidence_agent import get_confidence_agent
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


# ============================================================
# STATE DEFINITION
# ============================================================

class RAGState(TypedDict):
    """Shared state passed through all LangGraph nodes."""

    # Input
    original_query: str
    session_id: Optional[str]

    # Query Analysis
    improved_query: str
    sub_queries: list[str]
    is_ambiguous: bool
    query_issues: list[str]

    # Retrieval
    retrieved_chunks: list[dict]
    ranked_chunks: list[Any]  # list[RankedChunk]
    all_queries_tried: list[str]

    # Context Evaluation
    context_score: float
    needs_retry: bool
    evaluation_reason: str

    # Self-Healing
    retry_count: int
    healing_strategies: list[str]

    # Generation
    answer: str
    cited_chunk_ids: list[str]
    context_used: str
    generation_attempts: int

    # Verification
    is_grounded: bool
    grounding_score: float
    unsupported_claims: list[str]

    # Confidence
    confidence: float
    confidence_breakdown: dict

    # Meta
    error: Optional[str]


# ============================================================
# NODE IMPLEMENTATIONS
# ============================================================

async def node_analyze_query(state: RAGState) -> dict:
    """Node 1: Analyze and improve the user query."""
    query = state["original_query"]
    logger.info("Node: analyze_query", query=query)

    agent = get_query_analyzer()
    result = await agent.analyze(query)

    return {
        "improved_query": result["improved_query"],
        "sub_queries": result["sub_queries"],
        "is_ambiguous": result["is_ambiguous"],
        "query_issues": result.get("issues", []),
        "all_queries_tried": [query, result["improved_query"]] + result["sub_queries"],
    }


async def node_retrieve(state: RAGState) -> dict:
    """Node 2: Retrieve candidate chunks from Pinecone."""
    queries = state.get("sub_queries") or [state["improved_query"]]
    logger.info("Node: retrieve", query_count=len(queries))

    top_k = int(
        settings.top_k_retrieval
        * state.get("_top_k_multiplier", 1.0)
    )
    metadata_filter = None if state.get("_remove_filters") else None

    agent = get_retrieval_agent()
    chunks = await agent.retrieve(queries=queries, top_k=top_k, metadata_filter=metadata_filter)

    return {"retrieved_chunks": chunks}


async def node_rerank(state: RAGState) -> dict:
    """Node 3: Rerank retrieved chunks with cross-encoder."""
    chunks = state["retrieved_chunks"]
    query = state["improved_query"]
    logger.info("Node: rerank", chunk_count=len(chunks))

    if not chunks:
        return {"ranked_chunks": []}

    agent = get_reranker_agent()
    ranked = await agent.rerank(query=query, chunks=chunks)

    return {"ranked_chunks": ranked}


async def node_evaluate_context(state: RAGState) -> dict:
    """Node 4: Evaluate whether context is sufficient."""
    ranked = state["ranked_chunks"]
    query = state["improved_query"]
    logger.info("Node: evaluate_context", ranked_count=len(ranked))

    agent = get_context_evaluator()
    result = await agent.evaluate(query=query, ranked_chunks=ranked)

    return {
        "context_score": result["score"],
        "needs_retry": result["needs_retry"],
        "evaluation_reason": result.get("reason", ""),
    }


async def node_heal(state: RAGState) -> dict:
    """Node 5: Self-healing — rewrite query and prepare for retry."""
    retry_count = state.get("retry_count", 0) + 1
    logger.info("Node: heal", retry_count=retry_count)

    agent = get_healing_agent()
    result = await agent.heal(
        original_query=state["original_query"],
        current_query=state["improved_query"],
        retry_count=retry_count,
        previous_queries=state.get("all_queries_tried", []),
        context_score=state["context_score"],
    )

    # Update query state for next retrieval
    all_tried = state.get("all_queries_tried", []) + [result["rewritten_query"]]
    strategies = state.get("healing_strategies", []) + [result["strategy"]]

    return {
        "improved_query": result["rewritten_query"],
        "sub_queries": result["sub_queries"],
        "retry_count": retry_count,
        "healing_strategies": strategies,
        "all_queries_tried": all_tried,
        "_top_k_multiplier": result["top_k_multiplier"],
        "_remove_filters": result["remove_filters"],
    }


async def node_generate(state: RAGState) -> dict:
    """Node 6: Generate a grounded answer from ranked context."""
    ranked = state["ranked_chunks"]
    query = state["improved_query"]
    gen_attempts = state.get("generation_attempts", 0) + 1
    logger.info("Node: generate", attempt=gen_attempts)

    agent = get_generator_agent()
    result = await agent.generate(query=query, ranked_chunks=ranked)

    return {
        "answer": result["answer"],
        "cited_chunk_ids": result["cited_chunks"],
        "context_used": result["context_used"],
        "generation_attempts": gen_attempts,
    }


async def node_verify_hallucination(state: RAGState) -> dict:
    """Node 7: Verify the answer is grounded in source chunks."""
    logger.info("Node: verify_hallucination")

    agent = get_hallucination_agent()
    result = await agent.verify(
        query=state["improved_query"],
        answer=state["answer"],
        ranked_chunks=state["ranked_chunks"],
    )

    return {
        "is_grounded": result["is_grounded"],
        "grounding_score": result["grounding_score"],
        "unsupported_claims": result.get("unsupported_claims", []),
    }


async def node_score_confidence(state: RAGState) -> dict:
    """Node 8: Compute final confidence score."""
    logger.info("Node: score_confidence")

    agent = get_confidence_agent()
    result = await agent.compute(
        ranked_chunks=state["ranked_chunks"],
        context_score=state["context_score"],
        grounding_score=state["grounding_score"],
        cited_chunk_ids=state["cited_chunk_ids"],
        answer=state["answer"],
    )

    return {
        "confidence": result["confidence"],
        "confidence_breakdown": {
            k: v for k, v in result.items() if k != "confidence"
        },
    }


# ============================================================
# EDGE CONDITIONS
# ============================================================

def should_heal_or_generate(state: RAGState) -> str:
    """
    After context evaluation:
      - If context insufficient AND retries remain → heal
      - Otherwise → generate
    """
    needs_retry = state.get("needs_retry", False)
    retry_count = state.get("retry_count", 0)
    max_retries = settings.max_healing_retries

    if needs_retry and retry_count < max_retries:
        logger.info(
            "Routing to HEAL",
            retry_count=retry_count,
            max_retries=max_retries,
            context_score=state.get("context_score"),
        )
        return "heal"
    else:
        if needs_retry:
            logger.info("Max retries reached — proceeding to generate with best available context")
        return "generate"


def should_regenerate(state: RAGState) -> str:
    """
    After hallucination verification:
      - If not grounded AND first generation attempt → regenerate once
      - Otherwise → score confidence
    """
    is_grounded = state.get("is_grounded", True)
    gen_attempts = state.get("generation_attempts", 1)

    if not is_grounded and gen_attempts < 2:
        logger.info("Answer not grounded — triggering regeneration")
        return "generate"
    return "score_confidence"


# ============================================================
# GRAPH CONSTRUCTION
# ============================================================

def build_rag_graph() -> StateGraph:
    """
    Build and compile the LangGraph Self-Healing RAG workflow.

    Returns a compiled StateGraph ready to invoke with ainvoke().
    """
    workflow = StateGraph(RAGState)

    # Add all nodes
    workflow.add_node("analyze_query", node_analyze_query)
    workflow.add_node("retrieve", node_retrieve)
    workflow.add_node("rerank", node_rerank)
    workflow.add_node("evaluate_context", node_evaluate_context)
    workflow.add_node("heal", node_heal)
    workflow.add_node("generate", node_generate)
    workflow.add_node("verify_hallucination", node_verify_hallucination)
    workflow.add_node("score_confidence", node_score_confidence)

    # Set entry point
    workflow.set_entry_point("analyze_query")

    # Linear edges
    workflow.add_edge("analyze_query", "retrieve")
    workflow.add_edge("retrieve", "rerank")
    workflow.add_edge("rerank", "evaluate_context")

    # Conditional: heal or generate
    workflow.add_conditional_edges(
        "evaluate_context",
        should_heal_or_generate,
        {
            "heal": "heal",
            "generate": "generate",
        },
    )

    # Healing loops back to retrieve
    workflow.add_edge("heal", "retrieve")

    # After generation → verify
    workflow.add_edge("generate", "verify_hallucination")

    # Conditional: regenerate or finish
    workflow.add_conditional_edges(
        "verify_hallucination",
        should_regenerate,
        {
            "generate": "generate",
            "score_confidence": "score_confidence",
        },
    )

    # End
    workflow.add_edge("score_confidence", END)

    return workflow.compile()


# ============================================================
# GRAPH RUNNER
# ============================================================

class RAGPipeline:
    """High-level interface for running the RAG graph."""

    def __init__(self) -> None:
        self._graph = build_rag_graph()

    async def run(self, query: str, session_id: str | None = None) -> RAGState:
        """
        Execute the full RAG pipeline for a user query.

        Args:
            query     : User's natural language question
            session_id: Optional session ID for tracing

        Returns:
            Final RAGState with all fields populated
        """
        initial_state: RAGState = {
            "original_query": query,
            "session_id": session_id,
            "improved_query": query,
            "sub_queries": [],
            "is_ambiguous": False,
            "query_issues": [],
            "retrieved_chunks": [],
            "ranked_chunks": [],
            "all_queries_tried": [],
            "context_score": 0.0,
            "needs_retry": False,
            "evaluation_reason": "",
            "retry_count": 0,
            "healing_strategies": [],
            "answer": "",
            "cited_chunk_ids": [],
            "context_used": "",
            "generation_attempts": 0,
            "is_grounded": False,
            "grounding_score": 0.0,
            "unsupported_claims": [],
            "confidence": 0.0,
            "confidence_breakdown": {},
            "error": None,
        }

        logger.info("RAG pipeline started", query=query, session_id=session_id)

        try:
            final_state = await self._graph.ainvoke(initial_state)
            logger.info(
                "RAG pipeline complete",
                confidence=final_state.get("confidence"),
                retries=final_state.get("retry_count"),
                is_grounded=final_state.get("is_grounded"),
            )
            return final_state
        except Exception as exc:
            logger.error("RAG pipeline failed", error=str(exc))
            initial_state["error"] = str(exc)
            initial_state["answer"] = "An error occurred while processing your request."
            return initial_state


# Module-level singleton
_pipeline: RAGPipeline | None = None


def get_rag_pipeline() -> RAGPipeline:
    """Return the singleton RAGPipeline instance."""
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline()
    return _pipeline
