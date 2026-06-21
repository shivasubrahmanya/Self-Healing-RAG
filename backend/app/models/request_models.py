"""
Pydantic request and response models for all API endpoints.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# =========================================================
# SHARED MODELS
# =========================================================

class Source(BaseModel):
    """A single source chunk returned alongside an answer."""
    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_name: str = Field(..., description="Source document filename")
    page: int = Field(..., description="Page number in the original document")
    text_snippet: str = Field(..., description="Relevant excerpt from the chunk")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Reranker relevance score")
    source: str = Field(..., description="Full source path or URL")


# =========================================================
# CHAT
# =========================================================

class ChatRequest(BaseModel):
    """Request body for POST /chat."""
    query: str = Field(
        ...,
        min_length=2,
        max_length=2000,
        description="User's natural language question",
        examples=["What is the self-attention mechanism?"],
    )
    session_id: Optional[str] = Field(
        None, description="Optional session identifier for conversation tracking"
    )


class HealingInfo(BaseModel):
    """Healing pipeline metadata included in the response."""
    attempted: bool
    retries: int
    rewritten_queries: list[str]


class ChatResponse(BaseModel):
    """Response body for POST /chat."""
    answer: str = Field(..., description="Generated answer grounded in retrieved context")
    sources: list[Source] = Field(default_factory=list, description="Cited source chunks")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence score")
    context_score: float = Field(..., ge=0.0, le=1.0, description="Retrieval context quality score")
    is_grounded: bool = Field(..., description="Whether the answer is grounded in context")
    healing: HealingInfo = Field(..., description="Self-healing pipeline metadata")
    processing_time_ms: float = Field(..., description="Total processing time in milliseconds")
    session_id: Optional[str] = None


# =========================================================
# UPLOAD / INGESTION
# =========================================================

class UploadResponse(BaseModel):
    """Response body for POST /upload."""
    document_id: str = Field(..., description="Unique document identifier")
    document_name: str = Field(..., description="Original filename")
    chunks_indexed: int = Field(..., description="Number of chunks stored in Pinecone")
    status: str = Field(..., description="Processing status: success | partial | failed")
    message: str = Field(..., description="Human-readable status message")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# =========================================================
# HEALTH
# =========================================================

class ServiceStatus(BaseModel):
    """Status of a single dependency."""
    name: str
    healthy: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Response body for GET /health."""
    status: str = Field(..., description="overall | degraded | down")
    services: list[ServiceStatus]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =========================================================
# METRICS
# =========================================================

class MetricsResponse(BaseModel):
    """Response body for GET /metrics."""
    total_queries: int
    total_uploads: int
    total_chunks_indexed: int
    healing_triggered_count: int
    hallucinations_detected: int
    average_confidence: float
    average_context_score: float
    average_response_time_ms: float
    retry_rate: float = Field(..., description="Fraction of queries that triggered healing")
    hallucination_rate: float = Field(..., description="Fraction of answers flagged for hallucination")
    confidence_histogram: dict[str, int] = Field(
        default_factory=dict,
        description="Confidence score distribution bucketed to 0.1 intervals",
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
