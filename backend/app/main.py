"""
FastAPI application entry point.

Configures:
  - Lifespan startup/shutdown (models, Pinecone, LangSmith)
  - CORS middleware
  - Structured logging
  - Request ID middleware
  - All API routers
"""
from __future__ import annotations
import os

# Set environment variables for Windows to prevent Intel Fortran/MKL/OpenMP crashes
os.environ["FOR_DISABLE_CONSOLE_CTRL_HANDLER"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.chat import router as chat_router
from app.api.routes.upload import router as upload_router
from app.api.routes.health import health_router, metrics_router
from app.config import get_settings
from app.services.embedding_service import get_embedding_service
from app.services.pinecone_service import get_pinecone_service
from app.utils.logger import configure_logging, get_logger

settings = get_settings()
configure_logging()
logger = get_logger(__name__)


# ============================================================
# LIFESPAN — Startup & Shutdown
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Initialises heavyweight resources at startup; cleans up at shutdown.
    """
    logger.info("Starting Self-Healing RAG platform", version=settings.app_version)

    # Configure LangSmith tracing
    if settings.langchain_tracing_v2 and settings.langchain_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
        os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
        logger.info("LangSmith tracing enabled", project=settings.langchain_project)
    else:
        os.environ["LANGCHAIN_TRACING_V2"] = "false"
        logger.info("LangSmith tracing disabled")

    # Initialise Pinecone
    try:
        pinecone_svc = get_pinecone_service()
        pinecone_svc.initialize()
        logger.info("Pinecone initialised")
    except Exception as exc:
        logger.error("Pinecone init failed — continuing without vector DB", error=str(exc))

    # Pre-load embedding model (blocking but done once)
    try:
        emb_svc = get_embedding_service()
        logger.info("Embedding model ready", dimension=emb_svc.get_dimension())
    except Exception as exc:
        logger.error("Embedding model init failed", error=str(exc))

    # Pre-load reranker model
    try:
        from app.services.reranker_service import get_reranker_service
        get_reranker_service()
        logger.info("Reranker model ready")
    except Exception as exc:
        logger.error("Reranker init failed", error=str(exc))

    logger.info("Self-Healing RAG platform ready")
    yield

    # Shutdown
    logger.info("Shutting down")
    try:
        from app.services.llm_service import get_llm_service
        await get_llm_service().close()
    except Exception:
        pass


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Production-grade Self-Healing RAG platform. "
        "Automatically detects retrieval failures, rewrites queries, "
        "verifies answers, and provides confidence scores."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Rate Limiting & Security Middleware ----
from collections import defaultdict
from fastapi import HTTPException

# Simple in-memory rate limiter: 100 requests per minute
RATE_LIMIT_WINDOW = 60 
RATE_LIMIT_MAX_REQUESTS = 100
request_counts = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Clean up old requests and check limit
    request_counts[client_ip] = [t for t in request_counts[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(request_counts[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(status_code=429, content={"detail": "Too Many Requests"})
        
    request_counts[client_ip].append(now)
    return await call_next(request)


# ---- Request ID & Logging Middleware ----
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next) -> Response:
    """Attach a request ID and log every request with timing."""
    request_id = str(uuid.uuid4())[:8]
    start = time.monotonic()

    logger.info(
        "Request started",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )

    try:
        response: Response = await call_next(request)
        duration_ms = (time.monotonic() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "Request complete",
            request_id=request_id,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
        return response
    except Exception as exc:
        duration_ms = (time.monotonic() - start) * 1000
        logger.error(
            "Request failed",
            request_id=request_id,
            error=str(exc),
            duration_ms=round(duration_ms, 2),
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
        )


# ---- Routers ----
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
app.include_router(upload_router, prefix="/api/v1", tags=["Ingestion"])
app.include_router(health_router, prefix="/api/v1", tags=["System"])
app.include_router(metrics_router, prefix="/api/v1", tags=["System"])


@app.get("/", tags=["System"])
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
    }
