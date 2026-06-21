"""
Ingestion service — handles PDF, DOCX, TXT, and Markdown document processing.

Pipeline:
  Upload → Parse → Chunk (800/150) → Embed → Upsert to Pinecone

Metadata per chunk (from database.md):
  document_id, document_name, page, chunk_id, source, created_at, text
"""
from __future__ import annotations
import asyncio
import hashlib
import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.services.embedding_service import get_embedding_service
from app.services.pinecone_service import get_pinecone_service
from app.utils.logger import get_logger
from app.utils.exceptions import IngestionError, UnsupportedFileTypeError

logger = get_logger(__name__)
settings = get_settings()

SUPPORTED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
}


class IngestionService:
    """
    Orchestrates document ingestion: parse → chunk → embed → store.
    Supports PDF, DOCX, TXT, and Markdown formats.
    """

    def __init__(self) -> None:
        self._embedding_svc = get_embedding_service()
        self._pinecone_svc = get_pinecone_service()

    async def ingest_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> dict:
        """
        Full ingestion pipeline for an uploaded file.

        Returns:
            dict with document_id, document_name, chunks_indexed, status, message
        """
        # Determine file type
        ext = Path(filename).suffix.lower().lstrip(".")
        file_type = self._detect_type(content_type, ext)

        logger.info("Starting ingestion", filename=filename, file_type=file_type)

        # Parse document → list of (page_number, text)
        pages = await asyncio.get_event_loop().run_in_executor(
            None, self._parse, file_bytes, file_type
        )

        if not pages:
            raise IngestionError(f"No text could be extracted from {filename}")

        # Create unique document ID (hash of content for dedup)
        document_id = self._generate_document_id(file_bytes, filename)
        chunks = self._chunk_pages(pages, document_id, filename)

        if not chunks:
            raise IngestionError("Document produced no chunks after splitting")

        # Generate embeddings in batch
        texts = [c["text"] for c in chunks]
        logger.info("Generating embeddings", chunk_count=len(texts))
        embeddings = await self._embedding_svc.embed_batch(texts)

        # Upsert to Pinecone
        upserted = await self._pinecone_svc.upsert_chunks(chunks, embeddings)

        logger.info(
            "Ingestion complete",
            document_id=document_id,
            chunks=upserted,
            filename=filename,
        )
        return {
            "document_id": document_id,
            "document_name": filename,
            "chunks_indexed": upserted,
            "status": "success",
            "message": f"Successfully indexed {upserted} chunks from {filename}",
        }

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    def _detect_type(self, content_type: str, ext: str) -> str:
        """Detect file type from content-type or extension."""
        if content_type in SUPPORTED_TYPES:
            return SUPPORTED_TYPES[content_type]
        ext_map = {"pdf": "pdf", "docx": "docx", "txt": "txt", "md": "md", "markdown": "md"}
        if ext in ext_map:
            return ext_map[ext]
        raise UnsupportedFileTypeError(content_type or ext)

    def _parse(self, file_bytes: bytes, file_type: str) -> list[tuple[int, str]]:
        """
        Parse raw bytes into a list of (page_number, text) tuples.
        Page numbers are 1-indexed.
        """
        if file_type == "pdf":
            return self._parse_pdf(file_bytes)
        elif file_type == "docx":
            return self._parse_docx(file_bytes)
        elif file_type in ("txt", "md"):
            return self._parse_text(file_bytes)
        else:
            raise UnsupportedFileTypeError(file_type)

    def _parse_pdf(self, file_bytes: bytes) -> list[tuple[int, str]]:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages = []
        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append((i, text))
        return pages

    def _parse_docx(self, file_bytes: bytes) -> list[tuple[int, str]]:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        # DOCX has no real pages — treat every 10 paragraphs as a "page"
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        pages = []
        chunk_size = 10
        for i, start in enumerate(range(0, len(paragraphs), chunk_size), start=1):
            text = "\n".join(paragraphs[start : start + chunk_size])
            if text.strip():
                pages.append((i, text))
        return pages

    def _parse_text(self, file_bytes: bytes) -> list[tuple[int, str]]:
        text = file_bytes.decode("utf-8", errors="replace")
        # Split into pseudo-pages every 3000 chars
        page_size = 3000
        pages = []
        for i, start in enumerate(range(0, len(text), page_size), start=1):
            segment = text[start : start + page_size].strip()
            if segment:
                pages.append((i, segment))
        return pages

    # ------------------------------------------------------------------
    # Chunking
    # ------------------------------------------------------------------

    def _chunk_pages(
        self, pages: list[tuple[int, str]], document_id: str, filename: str
    ) -> list[dict]:
        """
        Split page texts into overlapping chunks using LangChain's splitter.
        Preserves page number metadata per chunk.
        """
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", " ", ""],
        )

        chunks: list[dict] = []
        now = datetime.utcnow().isoformat()

        for page_num, page_text in pages:
            splits = splitter.split_text(page_text)
            for j, split_text in enumerate(splits):
                chunk_id = f"{document_id}_p{page_num}_c{j}"
                chunks.append(
                    {
                        "chunk_id": chunk_id,
                        "document_id": document_id,
                        "document_name": filename,
                        "page": page_num,
                        "source": filename,
                        "created_at": now,
                        "text": split_text.strip(),
                    }
                )

        logger.info("Chunking complete", total_chunks=len(chunks))
        return chunks

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_document_id(file_bytes: bytes, filename: str) -> str:
        """Generate a deterministic document ID from content hash."""
        content_hash = hashlib.sha256(file_bytes).hexdigest()[:16]
        return f"doc_{content_hash}"


def get_ingestion_service() -> IngestionService:
    """Return a new IngestionService instance (stateless, can be shared)."""
    return IngestionService()
