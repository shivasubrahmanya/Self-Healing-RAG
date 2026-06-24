"""
Document registry service for tracking ingested files and database references.
Persists document metadata in data/documents.json.
"""
from __future__ import annotations
import json
import os
import asyncio
from datetime import datetime
from typing import Optional
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Data directory path inside the backend directory
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
DB_FILE = os.path.join(DATA_DIR, "documents.json")


class DocumentService:
    """Thread-safe document metadata registry service."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._ensure_data_file()

    def _ensure_data_file(self) -> None:
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            if not os.path.exists(DB_FILE):
                with open(DB_FILE, "w", encoding="utf-8") as f:
                    json.dump([], f)
        except Exception as exc:
            logger.error("Failed to initialize document DB file", error=str(exc))

    async def get_documents(self) -> list[dict]:
        """Fetch all ingested documents."""
        async with self._lock:
            docs = self._read_file()
            if not docs:
                # If local registry is empty, try to auto-discover from Pinecone
                try:
                    discovered = await self._discover_from_pinecone()
                    if discovered:
                        self._write_file(discovered)
                        return discovered
                except Exception as exc:
                    logger.error("Auto-discovery from Pinecone failed", error=str(exc))
            return docs

    async def _discover_from_pinecone(self) -> list[dict]:
        from app.services.pinecone_service import get_pinecone_service
        from app.services.embedding_service import get_embedding_service
        try:
            pinecone_svc = get_pinecone_service()
            emb_svc = get_embedding_service()
            
            # Embed a generic search term to construct a valid, non-zero query vector
            query_vector = await emb_svc.embed_query("RAG database document logs")
            matches = await pinecone_svc.dense_query(vector=query_vector, top_k=1000)
            
            docs_map = {}
            for m in matches:
                doc_id = m.get("document_id")
                doc_name = m.get("document_name")
                if doc_id and doc_name:
                    if doc_id not in docs_map:
                        docs_map[doc_id] = {
                            "document_id": doc_id,
                            "document_name": doc_name,
                            "chunks_indexed": 0,
                            "status": "indexed",
                            "created_at": m.get("created_at") or datetime.utcnow().isoformat()
                        }
                    docs_map[doc_id]["chunks_indexed"] += 1
                    
            return list(docs_map.values())
        except Exception as exc:
            logger.error("Error running Pinecone discover query", error=str(exc))
            return []

    def _read_file(self) -> list[dict]:
        try:
            if not os.path.exists(DB_FILE):
                return []
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            logger.error("Failed to read documents file", error=str(exc))
            return []

    def _write_file(self, data: list[dict]) -> None:
        try:
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as exc:
            logger.error("Failed to write documents file", error=str(exc))

    async def register_document(
        self,
        document_id: str,
        document_name: str,
        chunks_indexed: int,
        status: str = "indexed",
        size: Optional[int] = None
    ) -> dict:
        """Register a new document or update existing in the registry."""
        async with self._lock:
            docs = self._read_file()
            # Deduplicate by removing existing doc with same ID
            docs = [d for d in docs if d.get("document_id") != document_id]
            
            doc = {
                "document_id": document_id,
                "document_name": document_name,
                "chunks_indexed": chunks_indexed,
                "status": status,
                "size": size,
                "created_at": datetime.utcnow().isoformat()
            }
            docs.insert(0, doc)
            self._write_file(docs)
            logger.info("Registered document metadata", document_id=document_id, filename=document_name)
            return doc

    async def delete_document(self, document_id: str) -> bool:
        """Delete a document from the registry."""
        async with self._lock:
            docs = self._read_file()
            initial_len = len(docs)
            docs = [d for d in docs if d.get("document_id") != document_id]
            if len(docs) < initial_len:
                self._write_file(docs)
                logger.info("Purged document metadata from registry", document_id=document_id)
                return True
            return False


# Singleton instance
_document_service: Optional[DocumentService] = None


def get_document_service() -> DocumentService:
    """Return the singleton DocumentService instance."""
    global _document_service
    if _document_service is None:
        _document_service = DocumentService()
    return _document_service
