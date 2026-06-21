"""
LLM service — async Ollama client using httpx.
Model: llama3.1:latest (configurable via settings)

Provides:
  - generate()         : free-form text generation
  - generate_json()    : JSON-mode generation with retry
  - chat()             : multi-turn conversation
"""
from __future__ import annotations
import asyncio
import json
import re
from typing import Optional

import httpx

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.exceptions import LLMError, OllamaConnectionError

logger = get_logger(__name__)
settings = get_settings()


class LLMService:
    """Async HTTP client for Ollama's REST API."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=settings.ollama_host,
                timeout=httpx.Timeout(120.0, connect=10.0),
            )
        return self._client

    async def health_check(self) -> tuple[bool, Optional[float]]:
        """Ping Ollama. Returns (is_healthy, latency_ms)."""
        import time
        try:
            client = await self._get_client()
            start = time.monotonic()
            resp = await client.get("/")
            latency = (time.monotonic() - start) * 1000
            return resp.status_code == 200, latency
        except Exception:
            return False, None

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        model: Optional[str] = None,
    ) -> str:
        """
        Generate a text completion using Ollama's /api/generate endpoint.

        Args:
            prompt       : User prompt text
            system_prompt: Optional system instructions
            temperature  : Sampling temperature (low = more deterministic)
            model        : Override default model

        Returns:
            Generated text string
        """
        model = model or settings.ollama_model
        payload: dict = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": 2048},
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            client = await self._get_client()
            resp = await client.post("/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip()
        except httpx.ConnectError:
            raise OllamaConnectionError()
        except httpx.HTTPStatusError as exc:
            raise LLMError(f"Ollama returned HTTP {exc.response.status_code}")
        except Exception as exc:
            raise LLMError(f"LLM generation failed: {exc}")

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        retries: int = 3,
    ) -> dict:
        """
        Generate a JSON-formatted response.
        Retries up to `retries` times if the output is not valid JSON.

        Returns:
            Parsed dict
        """
        json_system = (system_prompt or "") + (
            "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, "
            "no explanations. Output raw JSON only."
        )

        for attempt in range(retries):
            raw = await self.generate(prompt, json_system, temperature=0.0, model=model)
            try:
                # Strip markdown code fences if present
                cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
                return json.loads(cleaned)
            except json.JSONDecodeError:
                logger.warning(
                    "JSON parse failed, retrying",
                    attempt=attempt + 1,
                    raw_excerpt=raw[:200],
                )
        raise LLMError(f"LLM did not produce valid JSON after {retries} attempts.")

    async def chat(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.1,
    ) -> str:
        """
        Multi-turn chat using Ollama's /api/chat endpoint.

        Args:
            messages: list of {"role": "user"|"assistant"|"system", "content": str}
            model   : model override
            temperature: sampling temperature

        Returns:
            Assistant response text
        """
        model = model or settings.ollama_model
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": 2048},
        }
        try:
            client = await self._get_client()
            resp = await client.post("/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["message"]["content"].strip()
        except httpx.ConnectError:
            raise OllamaConnectionError()
        except httpx.HTTPStatusError as exc:
            raise LLMError(f"Ollama chat returned HTTP {exc.response.status_code}")
        except Exception as exc:
            raise LLMError(f"Chat generation failed: {exc}")

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Module-level singleton
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Return the singleton LLMService instance."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
