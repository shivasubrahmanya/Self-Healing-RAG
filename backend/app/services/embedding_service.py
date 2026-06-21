"""
Embedding service using BAAI/bge-m3.
Produces 1024-dimensional dense embeddings for both queries and document chunks.
"""
from __future__ import annotations
import asyncio
from functools import lru_cache
from typing import Optional
import numpy as np

from app.utils.logger import get_logger
from app.utils.exceptions import RAGBaseException

logger = get_logger(__name__)

_MODEL_NAME = "BAAI/bge-m3"


class EmbeddingService:
    """
    Wraps the BAAI/bge-m3 model for text embedding.

    Uses FlagEmbedding for high-quality multilingual dense embeddings.
    Model is loaded once at startup and reused across requests.
    """

    def __init__(self) -> None:
        self._model = None  # Lazy-loaded on first call
        self._is_fallback = False

    def _load_model(self) -> None:
        """Load the embedding model (blocking — called once at startup)."""
        if self._model is not None:
            return
        try:
            from FlagEmbedding import BGEM3FlagModel
            logger.info("Loading embedding model", model=_MODEL_NAME)
            self._model = BGEM3FlagModel(_MODEL_NAME, use_fp16=True)
            self._is_fallback = False
            logger.info("Embedding model loaded successfully", model=_MODEL_NAME)
        except ImportError:
            # Fallback to sentence-transformers if FlagEmbedding not available
            logger.warning("FlagEmbedding not available, falling back to sentence-transformers")
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(_MODEL_NAME)
            self._is_fallback = True
        except Exception as exc:
            logger.error("Failed to load embedding model", error=str(exc))
            raise RAGBaseException(f"Embedding model load failed: {exc}")

    async def embed_query(self, text: str) -> list[float]:
        """
        Embed a single query string into a 1024-dim vector.
        Runs in a thread pool to avoid blocking the event loop.
        """
        return await asyncio.get_event_loop().run_in_executor(
            None, self._embed_sync, [text]
        )

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a batch of texts into 1024-dim vectors.
        Runs in a thread pool to avoid blocking the event loop.
        """
        return await asyncio.get_event_loop().run_in_executor(
            None, self._embed_batch_sync, texts
        )

    def _embed_sync(self, texts: list[str]) -> list[float]:
        """Synchronous single embedding — returns a flat float list."""
        self._load_model()
        try:
            # FlagEmbedding path
            if not self._is_fallback:
                result = self._model.encode(
                    texts,
                    batch_size=12,
                    max_length=8192,
                    return_dense=True,
                    return_sparse=False,
                    return_colbert_vecs=False,
                )
                vec = result["dense_vecs"][0]
            else:
                vec = self._model.encode(texts[0], normalize_embeddings=True)
            return vec.tolist()
        except Exception as exc:
            logger.error("Embedding failed", error=str(exc))
            raise RAGBaseException(f"Embedding generation failed: {exc}")

    def _embed_batch_sync(self, texts: list[str]) -> list[list[float]]:
        """Synchronous batch embedding — returns list of float lists."""
        self._load_model()
        try:
            if not self._is_fallback:
                result = self._model.encode(
                    texts,
                    batch_size=12,
                    max_length=8192,
                    return_dense=True,
                    return_sparse=False,
                    return_colbert_vecs=False,
                )
                return [vec.tolist() for vec in result["dense_vecs"]]
            else:
                vecs = self._model.encode(texts, normalize_embeddings=True, batch_size=32)
                return vecs.tolist()
        except Exception as exc:
            logger.error("Batch embedding failed", error=str(exc))
            raise RAGBaseException(f"Batch embedding failed: {exc}")

    def get_dimension(self) -> int:
        """Return the embedding dimension (1024 for bge-m3)."""
        return 1024


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    """Return the singleton EmbeddingService instance."""
    svc = EmbeddingService()
    svc._load_model()
    return svc
