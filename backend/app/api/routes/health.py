"""
GET /health — system health check.
GET /metrics — RAG pipeline performance metrics.
"""
from __future__ import annotations
import time

from fastapi import APIRouter, HTTPException

from app.models.request_models import HealthResponse, MetricsResponse, ServiceStatus
from app.services.llm_service import get_llm_service
from app.services.metrics_service import get_metrics_service
from app.services.pinecone_service import get_pinecone_service
from app.utils.logger import get_logger

health_router = APIRouter()
metrics_router = APIRouter()
logger = get_logger(__name__)


@health_router.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
    description="Check the health of all dependent services: Pinecone, Ollama.",
)
async def health_check() -> HealthResponse:
    """
    Ping all downstream services and report their health status.

    Returns an overall status: 'healthy', 'degraded', or 'down'.
    """
    services: list[ServiceStatus] = []

    # --- Pinecone ---
    try:
        start = time.monotonic()
        pinecone_svc = get_pinecone_service()
        stats = await pinecone_svc.get_index_stats()
        latency = (time.monotonic() - start) * 1000
        services.append(
            ServiceStatus(
                name="pinecone",
                healthy=True,
                latency_ms=round(latency, 2),
            )
        )
    except Exception as exc:
        services.append(
            ServiceStatus(name="pinecone", healthy=False, error=str(exc))
        )

    # --- Ollama ---
    try:
        llm_svc = get_llm_service()
        healthy, latency = await llm_svc.health_check()
        services.append(
            ServiceStatus(
                name="ollama",
                healthy=healthy,
                latency_ms=round(latency, 2) if latency else None,
                error=None if healthy else "Ollama did not respond",
            )
        )
    except Exception as exc:
        services.append(
            ServiceStatus(name="ollama", healthy=False, error=str(exc))
        )

    # --- Determine overall status ---
    all_healthy = all(s.healthy for s in services)
    any_healthy = any(s.healthy for s in services)
    overall = "healthy" if all_healthy else ("degraded" if any_healthy else "down")

    return HealthResponse(status=overall, services=services)


@metrics_router.get(
    "/metrics",
    response_model=MetricsResponse,
    summary="RAG pipeline metrics",
    description="Retrieve real-time performance metrics: confidence scores, retry rates, hallucination rates, response times.",
)
async def get_metrics() -> MetricsResponse:
    """Return a snapshot of all RAG pipeline performance metrics."""
    svc = get_metrics_service()
    data = await svc.get_metrics()
    
    # Sync with actual Pinecone index count to preserve telemetry across server restarts
    try:
        from app.services.pinecone_service import get_pinecone_service
        pinecone_svc = get_pinecone_service()
        stats = await pinecone_svc.get_index_stats()
        pinecone_total = stats.get("total_vectors", 0)
        if data.get("total_chunks_indexed", 0) < pinecone_total:
            data["total_chunks_indexed"] = pinecone_total
            if data.get("total_uploads", 0) == 0 and pinecone_total > 0:
                data["total_uploads"] = 1
    except Exception:
        pass
        
    return MetricsResponse(**data)


@health_router.get(
    "/config",
    summary="Get application configuration",
)
async def get_config():
    """Return application config parameters for Admin dashboard."""
    from app.config import get_settings
    settings = get_settings()
    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "environment": settings.environment,
        "embedding_engine": "BAAI/bge-m3",
        "reranker_system": "BAAI/bge-reranker-large",
        "primary_context_llm": settings.ollama_model,
        "vector_storage": f"Pinecone ({settings.pinecone_index})",
        "chunk_token_boundary": f"{settings.chunk_size} tokens",
        "overlap_boundary_offset": f"{settings.chunk_overlap} tokens",
        "max_candidates": f"{settings.top_k_retrieval} units",
        "post_rerank_window": f"{settings.top_k_rerank} units",
        "sufficiency_threshold": f"{settings.context_score_threshold:.2f}",
        "healing_loop_retry_limit": f"{settings.max_healing_retries} attempts",
    }


@health_router.get(
    "/documents",
    summary="Get all ingested documents",
)
async def get_documents():
    """Return list of all registered document models."""
    from app.services.document_service import get_document_service
    doc_registry = get_document_service()
    return await doc_registry.get_documents()


@health_router.delete(
    "/documents/{document_id}",
    summary="Delete an ingested document",
)
async def delete_document(document_id: str):
    """Delete a document from Pinecone vector storage and the local registry."""
    from app.services.document_service import get_document_service
    from app.services.pinecone_service import get_pinecone_service
    
    # 1. Delete vectors from Pinecone
    try:
        pinecone_svc = get_pinecone_service()
        await pinecone_svc.delete_document(document_id)
    except Exception as exc:
        logger.error("Failed to delete document vectors from Pinecone", error=str(exc))
        # Continue with registry deletion so index metadata stays in sync
        
    # 2. Delete document from metadata registry
    doc_registry = get_document_service()
    deleted = await doc_registry.delete_document(document_id)
    
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found in metadata database."
        )
        
    return {"status": "success", "message": f"Successfully deleted document {document_id}"}

