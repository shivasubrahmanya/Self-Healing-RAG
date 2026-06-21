"""
Agent 4: Context Evaluator

Responsibilities (from agents.md):
  - Determine if context is sufficient
  - Output: { "score": 0.82, "needs_retry": false }

Threshold (from rules.md): confidence < 0.70 → trigger self-healing

Evaluation factors:
  1. Number of chunks retrieved
  2. Average reranker relevance score
  3. LLM-based relevance assessment (query vs context)
"""
from __future__ import annotations

from app.config import get_settings
from app.services.llm_service import get_llm_service
from app.services.reranker_service import RankedChunk
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

EVAL_SYSTEM_PROMPT = """You are a context quality evaluator for a RAG system.
Given a user query and retrieved context chunks, determine whether the context is sufficient to answer the query.

Respond ONLY with valid JSON:
{
  "score": <float between 0.0 and 1.0>,
  "needs_retry": <true|false>,
  "reason": "<brief explanation>"
}

Scoring guide:
  0.9+ : Context directly and fully answers the query
  0.7-0.9: Context mostly covers the query
  0.5-0.7: Context partially covers the query (needs_retry = true)
  0.0-0.5: Context is insufficient or irrelevant (needs_retry = true)

needs_retry = true if score < 0.70
"""


class ContextEvaluatorAgent:
    """
    Evaluates whether retrieved context is sufficient to generate a reliable answer.

    Uses a hybrid approach:
      1. Heuristic scoring (chunk count, avg relevance score)
      2. LLM-based semantic assessment (query ↔ context alignment)
    Final score = weighted average of both.
    """

    def __init__(self) -> None:
        self._llm = get_llm_service()
        self._threshold = settings.context_score_threshold

    async def evaluate(
        self,
        query: str,
        ranked_chunks: list[RankedChunk],
    ) -> dict:
        """
        Evaluate context quality for the given query.

        Args:
            query        : The (possibly improved) query string
            ranked_chunks: Top-N reranked chunks

        Returns:
            dict: { "score": float, "needs_retry": bool, "reason": str }
        """
        logger.info("Evaluating context", query=query, chunk_count=len(ranked_chunks))

        # --- Heuristic score ---
        heuristic_score = self._heuristic_score(ranked_chunks)

        if heuristic_score < 0.2:
            # No useful chunks at all — skip LLM call
            logger.info("Heuristic: no useful context", heuristic_score=heuristic_score)
            return {
                "score": heuristic_score,
                "needs_retry": True,
                "reason": "No relevant chunks retrieved",
            }

        # --- LLM semantic score ---
        context_text = self._build_context_text(ranked_chunks)
        llm_result = await self._llm_evaluate(query, context_text)

        # Weighted combination: 40% heuristic + 60% LLM semantic
        combined_score = 0.4 * heuristic_score + 0.6 * llm_result.get("score", 0.5)
        combined_score = round(min(max(combined_score, 0.0), 1.0), 4)
        needs_retry = combined_score < self._threshold

        result = {
            "score": combined_score,
            "needs_retry": needs_retry,
            "reason": llm_result.get("reason", ""),
            "heuristic_score": heuristic_score,
            "llm_score": llm_result.get("score", 0.5),
        }
        logger.info("Context evaluation complete", **result)
        return result

    def _heuristic_score(self, chunks: list[RankedChunk]) -> float:
        """
        Compute a heuristic score based on:
          - Number of chunks (0 = 0.0, 5+ = 1.0)
          - Average reranker relevance score
        """
        if not chunks:
            return 0.0

        n_score = min(len(chunks) / 5.0, 1.0)
        avg_relevance = sum(c.relevance_score for c in chunks) / len(chunks)
        return round(0.3 * n_score + 0.7 * avg_relevance, 4)

    def _build_context_text(self, chunks: list[RankedChunk], max_chars: int = 3000) -> str:
        """Build a context string from ranked chunks for the LLM."""
        parts = []
        total = 0
        for i, chunk in enumerate(chunks, start=1):
            snippet = f"[{i}] {chunk.document_name} (p.{chunk.page}):\n{chunk.text}"
            if total + len(snippet) > max_chars:
                break
            parts.append(snippet)
            total += len(snippet)
        return "\n\n".join(parts)

    async def _llm_evaluate(self, query: str, context_text: str) -> dict:
        """Use LLM to semantically score context relevance."""
        prompt = f"""User Query: "{query}"

Retrieved Context:
{context_text}

Evaluate whether this context is sufficient to answer the query."""

        try:
            return await self._llm.generate_json(
                prompt=prompt,
                system_prompt=EVAL_SYSTEM_PROMPT,
            )
        except Exception as exc:
            logger.warning("LLM context evaluation failed", error=str(exc))
            return {"score": 0.5, "needs_retry": False, "reason": "LLM eval unavailable"}


def get_context_evaluator() -> ContextEvaluatorAgent:
    """Return a ContextEvaluatorAgent instance."""
    return ContextEvaluatorAgent()
