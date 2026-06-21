"""
API tests for POST /chat and POST /upload endpoints.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
import io


@pytest.fixture
def client():
    """Create a test client with mocked dependencies."""
    with patch("app.services.pinecone_service.get_pinecone_service") as mock_pc, \
         patch("app.services.embedding_service.get_embedding_service") as mock_emb, \
         patch("app.services.reranker_service.get_reranker_service") as mock_rr:

        # Mock pinecone
        pc_instance = MagicMock()
        pc_instance.initialize.return_value = None
        pc_instance.get_index_stats = AsyncMock(return_value={"total_vectors": 100})
        mock_pc.return_value = pc_instance

        # Mock embeddings
        emb_instance = MagicMock()
        emb_instance._load_model.return_value = None
        emb_instance.get_dimension.return_value = 1024
        mock_emb.return_value = emb_instance

        # Mock reranker
        rr_instance = MagicMock()
        rr_instance._load_model.return_value = None
        mock_rr.return_value = rr_instance

        from app.main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


class TestChatEndpoint:

    def test_chat_requires_query(self, client):
        resp = client.post("/api/v1/chat", json={})
        assert resp.status_code == 422  # Unprocessable entity

    def test_chat_query_too_short(self, client):
        resp = client.post("/api/v1/chat", json={"query": "a"})
        assert resp.status_code == 422

    def test_chat_returns_expected_fields(self, client):
        with patch("app.api.routes.chat.get_rag_pipeline") as mock_pipeline:
            pipeline = MagicMock()
            pipeline.run = AsyncMock(return_value={
                "answer": "Transformers use self-attention [doc.pdf, Page 3].",
                "ranked_chunks": [],
                "context_score": 0.85,
                "confidence": 0.88,
                "is_grounded": True,
                "retry_count": 0,
                "all_queries_tried": ["test", "improved test"],
                "healing_strategies": [],
                "error": None,
            })
            mock_pipeline.return_value = pipeline

            resp = client.post("/api/v1/chat", json={"query": "How do transformers work?"})
            assert resp.status_code == 200
            data = resp.json()
            assert "answer" in data
            assert "sources" in data
            assert "confidence" in data
            assert "is_grounded" in data
            assert "healing" in data


class TestUploadEndpoint:

    def test_upload_empty_file_rejected(self, client):
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        assert resp.status_code == 400

    def test_upload_valid_text_file(self, client):
        with patch("app.api.routes.upload.get_ingestion_service") as mock_svc:
            svc = MagicMock()
            svc.ingest_file = AsyncMock(return_value={
                "document_id": "doc_abc123",
                "document_name": "test.txt",
                "chunks_indexed": 5,
                "status": "success",
                "message": "Successfully indexed 5 chunks from test.txt",
            })
            mock_svc.return_value = svc

            content = b"This is a test document with enough content to chunk." * 20
            resp = client.post(
                "/api/v1/upload",
                files={"file": ("test.txt", content, "text/plain")},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["document_id"] == "doc_abc123"
            assert data["chunks_indexed"] == 5

    def test_upload_unsupported_type_rejected(self, client):
        with patch("app.api.routes.upload.get_ingestion_service") as mock_svc:
            from app.utils.exceptions import UnsupportedFileTypeError
            svc = MagicMock()
            svc.ingest_file = AsyncMock(side_effect=UnsupportedFileTypeError("image/jpeg"))
            mock_svc.return_value = svc

            resp = client.post(
                "/api/v1/upload",
                files={"file": ("photo.jpg", b"fake_jpeg", "image/jpeg")},
            )
            assert resp.status_code == 415


class TestHealthEndpoint:

    def test_health_returns_status(self, client):
        with patch("app.api.routes.health.get_pinecone_service") as mock_pc, \
             patch("app.api.routes.health.get_llm_service") as mock_llm:

            pc = MagicMock()
            pc.get_index_stats = AsyncMock(return_value={"total_vectors": 50})
            mock_pc.return_value = pc

            llm = MagicMock()
            llm.health_check = AsyncMock(return_value=(True, 45.2))
            mock_llm.return_value = llm

            resp = client.get("/api/v1/health")
            assert resp.status_code == 200
            data = resp.json()
            assert "status" in data
            assert "services" in data
