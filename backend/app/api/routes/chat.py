"""
POST /chat endpoint — runs the full Self-Healing RAG pipeline.
"""
from __future__ import annotations
import time
import uuid

from fastapi import APIRouter, HTTPException, status

from app.models.request_models import ChatRequest, ChatResponse, HealingInfo, Source
from app.services.metrics_service import get_metrics_service
from app.utils.exceptions import InsufficientContextError
from app.utils.logger import get_logger
from app.workflows.rag_graph import get_rag_pipeline

router = APIRouter()
logger = get_logger(__name__)


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with your knowledge base",
    description="Submit a natural language query. The Self-Healing RAG pipeline will retrieve, evaluate, heal if needed, generate, verify, and score the response.",
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Run the full Self-Healing RAG pipeline for the given query.

    The pipeline automatically:
    - Analyzes and improves the query
    - Retrieves relevant document chunks
    - Reranks for relevance
    - Evaluates context quality (heals if score < 0.70)
    - Generates a grounded answer with citations
    - Verifies against hallucination
    - Returns a confidence score
    """
    start_time = time.monotonic()
    session_id = request.session_id or str(uuid.uuid4())

    logger.info("Chat request received", query=request.query, session_id=session_id)

    try:
        pipeline = get_rag_pipeline()
        state = await pipeline.run(query=request.query, session_id=session_id)
    except Exception as exc:
        logger.error("Pipeline error", error=str(exc), session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG pipeline error: {exc}",
        )

    processing_time_ms = (time.monotonic() - start_time) * 1000

    # Build Source objects from ranked chunks
    sources: list[Source] = []
    for chunk in state.get("ranked_chunks", []):
        sources.append(
            Source(
                chunk_id=chunk.chunk_id,
                document_name=chunk.document_name,
                page=chunk.page,
                text_snippet=chunk.text[:300] + "..." if len(chunk.text) > 300 else chunk.text,
                relevance_score=round(chunk.relevance_score, 4),
                source=chunk.source,
            )
        )

    # Build healing info
    healing = HealingInfo(
        attempted=state.get("retry_count", 0) > 0,
        retries=state.get("retry_count", 0),
        rewritten_queries=state.get("all_queries_tried", [])[2:],  # Skip original + improved
    )

    # Record metrics asynchronously
    metrics = get_metrics_service()
    await metrics.record_query(
        confidence=state.get("confidence", 0.0),
        context_score=state.get("context_score", 0.0),
        response_time_ms=processing_time_ms,
        healing_triggered=healing.attempted,
        hallucination_detected=not state.get("is_grounded", True),
    )

    response = ChatResponse(
        answer=state.get("answer", "Insufficient information found."),
        sources=sources,
        confidence=state.get("confidence", 0.0),
        context_score=state.get("context_score", 0.0),
        is_grounded=state.get("is_grounded", False),
        healing=healing,
        processing_time_ms=round(processing_time_ms, 2),
        session_id=session_id,
    )

    logger.info(
        "Chat response sent",
        confidence=response.confidence,
        sources=len(sources),
        processing_time_ms=processing_time_ms,
    )
    return response
