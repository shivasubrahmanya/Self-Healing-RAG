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
    """Async HTTP client for Ollama and Gemini APIs."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None
        self._gemini_client: Optional[httpx.AsyncClient] = None

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
        use_gemini: bool = False,
        response_json: bool = False,
    ) -> str:
        """
        Generate a text completion using Ollama or Gemini.

        Args:
            prompt       : User prompt text
            system_prompt: Optional system instructions
            temperature  : Sampling temperature (low = more deterministic)
            model        : Override default model name
            use_gemini   : If True, uses Gemini API (falls back to Ollama if no API key)
            response_json: If True, configures Gemini to output JSON

        Returns:
            Generated text string
        """
        if use_gemini and settings.gemini_api_key:
            return await self._generate_gemini(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                model=model,
                response_json=response_json,
            )

        # Default Ollama path
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

    async def _generate_gemini(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        model: Optional[str] = None,
        response_json: bool = False,
    ) -> str:
        """Generate content using the cloud Gemini API."""
        model = model or settings.gemini_model or "gemini-2.5-flash"
        api_key = settings.gemini_api_key
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        contents = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }

        if system_prompt:
            contents["systemInstruction"] = {
                "parts": [
                    {
                        "text": system_prompt
                    }
                ]
            }

        generation_config = {
            "temperature": temperature,
            "maxOutputTokens": 2048,
        }
        if response_json:
            generation_config["responseMimeType"] = "application/json"

        contents["generationConfig"] = generation_config

        try:
            if self._gemini_client is None or self._gemini_client.is_closed:
                self._gemini_client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))

            logger.info("Calling Gemini API", model=model, response_json=response_json)
            resp = await self._gemini_client.post(url, json=contents)
            resp.raise_for_status()
            data = resp.json()
            
            candidates = data.get("candidates", [])
            if not candidates:
                raise LLMError("Gemini returned empty candidates list")
            
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if not parts:
                raise LLMError("Gemini candidate content has no parts")
                
            return parts[0].get("text", "").strip()
        except httpx.HTTPStatusError as exc:
            logger.error("Gemini API HTTP error", status_code=exc.response.status_code, body=exc.response.text)
            raise LLMError(f"Gemini API returned HTTP {exc.response.status_code}: {exc.response.text}")
        except Exception as exc:
            logger.error("Gemini API unexpected error", error=str(exc))
            raise LLMError(f"Gemini generation failed: {exc}")

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        retries: int = 3,
        use_gemini: bool = False,
    ) -> dict:
        """
        Generate a JSON-formatted response.
        Retries up to `retries` times if the output is not valid JSON.

        Returns:
            Parsed dict
        """
        # For Gemini, we use its native JSON mode instead of appending parsing instructions
        json_system = system_prompt or ""
        if not use_gemini:
            json_system += (
                "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, "
                "no explanations. Output raw JSON only."
            )

        for attempt in range(retries):
            raw = await self.generate(
                prompt=prompt,
                system_prompt=json_system,
                temperature=0.0,
                model=model,
                use_gemini=use_gemini,
                response_json=use_gemini,
            )
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
        """Close the HTTP clients."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
        if self._gemini_client and not self._gemini_client.is_closed:
            await self._gemini_client.aclose()


# Module-level singleton
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Return the singleton LLMService instance."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
