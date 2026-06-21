"""
Application configuration using pydantic-settings.
All values are read from environment variables / .env file.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App ----
    app_name: str = "Self-Healing RAG"
    app_version: str = "1.0.0"
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # ---- Security ----
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # ---- Pinecone ----
    pinecone_api_key: str = ""
    pinecone_env: str = "us-east-1"
    pinecone_index: str = "self-healing-rag"

    # ---- Ollama ----
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:latest"

    # ---- LangSmith ----
    langchain_tracing_v2: bool = True
    langchain_api_key: str = ""
    langchain_project: str = "self-healing-rag"

    # ---- RAG Config ----
    top_k_retrieval: int = 20
    top_k_rerank: int = 5
    multi_query_count: int = 3
    context_score_threshold: float = 0.70
    max_healing_retries: int = 3

    # ---- Chunking ----
    chunk_size: int = 800
    chunk_overlap: int = 150

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
