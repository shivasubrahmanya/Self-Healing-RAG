"""
Custom exception hierarchy for the Self-Healing RAG platform.
All domain exceptions inherit from RAGBaseException for consistent handling.
"""
from fastapi import HTTPException, status


class RAGBaseException(Exception):
    """Base exception for all application errors."""

    def __init__(self, message: str, code: str = "RAG_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


# ---- Ingestion ----

class IngestionError(RAGBaseException):
    """Raised when document ingestion fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, "INGESTION_ERROR")


class UnsupportedFileTypeError(IngestionError):
    """Raised for unsupported document formats."""

    def __init__(self, file_type: str) -> None:
        super().__init__(f"Unsupported file type: {file_type}")


# ---- Retrieval ----

class RetrievalError(RAGBaseException):
    """Raised when Pinecone retrieval fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, "RETRIEVAL_ERROR")


class PineconeConnectionError(RetrievalError):
    """Raised when Pinecone is unreachable."""

    def __init__(self) -> None:
        super().__init__("Cannot connect to Pinecone.")


# ---- LLM ----

class LLMError(RAGBaseException):
    """Raised when the LLM call fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message, "LLM_ERROR")


class OllamaConnectionError(LLMError):
    """Raised when Ollama is unreachable."""

    def __init__(self) -> None:
        super().__init__("Cannot connect to Ollama.")


# ---- Healing ----

class MaxRetriesExceededError(RAGBaseException):
    """Raised when the maximum healing retries are exhausted."""

    def __init__(self, retries: int) -> None:
        super().__init__(
            f"Maximum healing retries ({retries}) exceeded.", "MAX_RETRIES_EXCEEDED"
        )


# ---- Context ----

class InsufficientContextError(RAGBaseException):
    """Raised when context cannot be retrieved even after healing."""

    def __init__(self) -> None:
        super().__init__("Insufficient information found.", "INSUFFICIENT_CONTEXT")


def to_http_exception(exc: RAGBaseException) -> HTTPException:
    """Convert a domain exception to an HTTP 500 response."""
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={"code": exc.code, "message": exc.message},
    )
