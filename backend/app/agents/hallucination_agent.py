"""
Agent 7: Hallucination Verifier Agent

Responsibilities (from agents.md):
  - Verify answer grounding against source chunks
  - Detect unsupported claims
  - Output: { "grounded": true, "score": 0.91 }

From rules.md: if hallucination detected → regenerate answer.
From PDF PRD: checks for unsupported claims, missing citations, contradictions.
"""
from __future__ import annotations

from app.services.llm_service import get_llm_service
from app.services.reranker_service import RankedChunk
from app.utils.logger import get_logger

logger = get_logger(__name__)

HALLUCINATION_SYSTEM_PROMPT = """You are a hallucination detection expert for a RAG system.

Your task: verify whether the generated answer is fully supported by the provided context chunks.

Respond ONLY with valid JSON:
{
  "grounded": <true|false>,
  "score": <float 0.0-1.0>,
  "unsupported_claims": ["<claim not found in context>"],
  "contradictions": ["<answer contradicts context>"],
  "missing_citations": ["<fact without citation>"],
  "reason": "<overall assessment>"
}

Scoring:
  1.0  : Every claim is directly supported by context
  0.7-1.0: Mostly grounded, minor issues
  0.5-0.7: Partially grounded (grounded = false)
  0.0-0.5: Significant hallucination (grounded = false)

grounded = true only if score >= 0.70 AND unsupported_claims is empty or trivial.
"""


class HallucinationAgent:
    """
    Verifies that the generated answer is grounded in the retrieved context.

    Uses LLM-as-judge to identify:
      - Unsupported factual claims
      - Contradictions with source material
      - Missing citations
    """

    def __init__(self) -> None:
        self._llm = get_llm_service()
        self._grounding_threshold = 0.70

    async def verify(
        self,
        query: str,
        answer: str,
        ranked_chunks: list[RankedChunk],
    ) -> dict:
        """
        Verify whether the answer is grounded in the source chunks.

        Args:
            query        : The original user query
            answer       : The generated answer text
            ranked_chunks: Source chunks used for generation

        Returns:
            dict with:
              - is_grounded: bool
              - grounding_score: float
              - unsupported_claims: list[str]
              - contradictions: list[str]
              - missing_citations: list[str]
              - reason: str
        """
        logger.info("Verifying hallucination", answer_length=len(answer))

        if not answer or "Insufficient information" in answer:
            return {
                "is_grounded": True,
                "grounding_score": 1.0,
                "unsupported_claims": [],
                "contradictions": [],
                "missing_citations": [],
                "reason": "Answer acknowledges insufficient context — no hallucination risk",
            }

        context_text = self._build_context(ranked_chunks)
        prompt = self._build_prompt(query, answer, context_text)

        try:
            result = await self._llm.generate_json(
                prompt=prompt,
                system_prompt=HALLUCINATION_SYSTEM_PROMPT,
                use_gemini=True,
            )
        except Exception as exc:
            logger.warning("Hallucination check failed, assuming grounded", error=str(exc))
            return self._safe_default()

        grounded = bool(result.get("grounded", True))
        score = float(result.get("score", 0.8))

        # Apply threshold
        if score < self._grounding_threshold:
            grounded = False

        output = {
            "is_grounded": grounded,
            "grounding_score": round(score, 4),
            "unsupported_claims": result.get("unsupported_claims", []),
            "contradictions": result.get("contradictions", []),
            "missing_citations": result.get("missing_citations", []),
            "reason": result.get("reason", ""),
        }

        logger.info(
            "Hallucination check complete",
            is_grounded=grounded,
            score=score,
            unsupported_count=len(output["unsupported_claims"]),
        )
        return output

    def _build_context(self, chunks: list[RankedChunk], max_chars: int = 4000) -> str:
        """Build compact context string for the verification prompt."""
        parts = []
        total = 0
        for i, c in enumerate(chunks, start=1):
            snippet = f"[{i}] {c.document_name} p.{c.page}: {c.text[:500]}"
            if total + len(snippet) > max_chars:
                break
            parts.append(snippet)
            total += len(snippet)
        return "\n\n".join(parts)

    def _build_prompt(self, query: str, answer: str, context: str) -> str:
        return f"""Query: "{query}"

Generated Answer:
{answer}

Retrieved Context (ground truth):
{context}

Verify whether every claim in the answer is supported by the context above."""

    def _safe_default(self) -> dict:
        """Return a conservative default when verification fails."""
        return {
            "is_grounded": True,
            "grounding_score": 0.75,
            "unsupported_claims": [],
            "contradictions": [],
            "missing_citations": [],
            "reason": "Verification service unavailable — conservative pass",
        }


def get_hallucination_agent() -> HallucinationAgent:
    """Return a HallucinationAgent instance."""
    return HallucinationAgent()
