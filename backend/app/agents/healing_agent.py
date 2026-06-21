"""
Agent 5: Healing Agent

Responsibilities (from agents.md + PDF PRD):
  - Rewrite query using LLM
  - Expand search scope (increase top_k, relax filters)
  - Retry retrieval
  - Semantic expansion
  Max Retries = 3 (from rules.md and agents.md)

Healing actions per retry attempt:
  Attempt 1: Query rewrite + keep same top_k
  Attempt 2: Query expansion + increase top_k by 50%
  Attempt 3: Aggressive semantic expansion + maximum top_k + remove filters
"""
from __future__ import annotations

from app.config import get_settings
from app.services.llm_service import get_llm_service
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

REWRITE_SYSTEM_PROMPT = """You are a query optimization expert for a document retrieval system.
Your goal is to rewrite the query to retrieve better, more relevant documents.

Respond ONLY with valid JSON:
{
  "rewritten_query": "<improved query>",
  "sub_queries": ["<variation 1>", "<variation 2>", "<variation 3>"],
  "strategy": "<what you changed and why>"
}

Rewriting strategies:
- Add domain-specific terminology
- Expand acronyms
- Add synonyms and related concepts
- Rephrase as a more specific information need
- Break complex questions into focused sub-questions
"""


class HealingAgent:
    """
    Self-healing agent that rewrites queries and expands retrieval when
    the context evaluator determines retrieved context is insufficient.

    Called iteratively by the LangGraph workflow up to MAX_HEALING_RETRIES times.
    """

    def __init__(self) -> None:
        self._llm = get_llm_service()
        self._max_retries = settings.max_healing_retries

    async def heal(
        self,
        original_query: str,
        current_query: str,
        retry_count: int,
        previous_queries: list[str],
        context_score: float,
    ) -> dict:
        """
        Generate a healing strategy for the current retry attempt.

        Args:
            original_query  : The user's original query
            current_query   : The most recently used query
            retry_count     : Current retry number (1-indexed)
            previous_queries: All queries tried so far
            context_score   : The context score that triggered healing

        Returns:
            dict with:
              - rewritten_query: str
              - sub_queries: list[str]
              - top_k_multiplier: float  (increase top_k)
              - remove_filters: bool
              - strategy: str
        """
        logger.info(
            "Healing triggered",
            retry=retry_count,
            context_score=context_score,
            current_query=current_query,
        )

        # Determine healing aggressiveness by retry attempt
        top_k_multiplier = 1.0 + (retry_count * 0.5)  # 1.5x, 2.0x, 2.5x
        remove_filters = retry_count >= 3  # Last attempt: no filters

        # LLM-based query rewrite
        prompt = self._build_prompt(
            original_query, current_query, retry_count, previous_queries, context_score
        )

        try:
            result = await self._llm.generate_json(
                prompt=prompt,
                system_prompt=REWRITE_SYSTEM_PROMPT,
            )
            rewritten = str(result.get("rewritten_query", current_query)).strip()
            sub_queries = result.get("sub_queries", [rewritten])
            strategy = result.get("strategy", "")
        except Exception as exc:
            logger.warning("Healing LLM failed, using fallback", error=str(exc))
            rewritten = f"detailed explanation of: {original_query}"
            sub_queries = [rewritten, f"{original_query} overview", f"{original_query} examples"]
            strategy = "Fallback: prefix expansion"

        # Avoid repeating queries we've already tried
        all_tried = set(previous_queries + [original_query, current_query])
        sub_queries = [q for q in sub_queries if q not in all_tried] or sub_queries

        logger.info(
            "Healing complete",
            rewritten_query=rewritten,
            sub_query_count=len(sub_queries),
            top_k_multiplier=top_k_multiplier,
            remove_filters=remove_filters,
            strategy=strategy,
        )

        return {
            "rewritten_query": rewritten,
            "sub_queries": sub_queries,
            "top_k_multiplier": top_k_multiplier,
            "remove_filters": remove_filters,
            "strategy": strategy,
        }

    def _build_prompt(
        self,
        original: str,
        current: str,
        retry: int,
        previous: list[str],
        score: float,
    ) -> str:
        tried_str = "\n".join(f"  - {q}" for q in previous) if previous else "  None"
        return f"""A RAG retrieval attempt failed with a context quality score of {score:.2f} (threshold: {settings.context_score_threshold}).

Original user query: "{original}"
Most recent query used: "{current}"
Retry attempt: {retry} of {settings.max_healing_retries}

Previously tried queries:
{tried_str}

Please rewrite the query to retrieve better documents from a knowledge base.
Use a different strategy from previous attempts."""


def get_healing_agent() -> HealingAgent:
    """Return a HealingAgent instance."""
    return HealingAgent()
