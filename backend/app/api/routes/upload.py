"""
POST /upload endpoint — handles document ingestion.
Supports PDF, DOCX, TXT, and Markdown files.
"""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.models.request_models import UploadResponse
from app.services.ingestion_service import get_ingestion_service
from app.services.metrics_service import get_metrics_service
from app.utils.exceptions import IngestionError, UnsupportedFileTypeError
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Maximum upload size: 50 MB
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "application/octet-stream",  # Some browsers send this for .md
}


@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload and index a document",
    description="Upload a PDF, DOCX, TXT, or Markdown file. It will be parsed, chunked, embedded, and stored in Pinecone.",
)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    """
    Ingest a document into the vector knowledge base.

    The document is:
    1. Parsed (PDF → text, DOCX → paragraphs, TXT/MD → segments)
    2. Split into 800-token chunks with 150-token overlap
    3. Embedded with BAAI/bge-m3 (1024-dim)
    4. Stored in Pinecone with metadata
    """
    logger.info("Upload request", filename=file.filename, content_type=file.content_type)

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a name",
        )

    # Read file bytes
    file_bytes = await file.read()

    # Size validation
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB",
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty",
        )

    try:
        svc = get_ingestion_service()
        result = await svc.ingest_file(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
        )
    except UnsupportedFileTypeError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=exc.message,
        )
    except IngestionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        )
    except Exception as exc:
        logger.error("Unexpected ingestion error", error=str(exc), filename=file.filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {exc}",
        )

    # Record metrics
    metrics = get_metrics_service()
    await metrics.record_upload(chunks_indexed=result["chunks_indexed"])

    logger.info(
        "Upload complete",
        document_id=result["document_id"],
        chunks=result["chunks_indexed"],
    )

    return UploadResponse(**result)
