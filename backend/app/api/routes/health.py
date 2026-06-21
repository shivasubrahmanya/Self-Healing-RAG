"""
GET /health — system health check.
GET /metrics — RAG pipeline performance metrics.
"""
from __future__ import annotations
import time

from fastapi import APIRouter

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
    return MetricsResponse(**data)
