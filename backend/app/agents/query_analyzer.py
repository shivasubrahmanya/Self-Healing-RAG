"""
Agent 1: Query Analyzer

Responsibilities (from agents.md):
  - Detect ambiguity
  - Detect short / incomplete queries
  - Improve searchability
  - Generate 3-5 semantic sub-queries (Multi-Query from PDF PRD)

Output:
  {
    "is_ambiguous": bool,
    "improved_query": str,
    "sub_queries": list[str],
    "issues": list[str]
  }
"""
from __future__ import annotations

from app.services.llm_service import get_llm_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

ANALYSIS_SYSTEM_PROMPT = """You are a query analysis expert for a RAG system.
Your job is to analyze user queries and improve their searchability.

Respond ONLY with valid JSON in exactly this format:
{
  "is_ambiguous": <true|false>,
  "improved_query": "<rewritten, more specific version of the query>",
  "sub_queries": ["<variation 1>", "<variation 2>", "<variation 3>"],
  "issues": ["<issue1>", "<issue2>"]
}

Rules:
- is_ambiguous = true if query is vague, too short (<5 words), or lacks context
- improved_query should be detailed and specific, 10-20 words
- sub_queries: 3-5 semantically different variations to maximize retrieval coverage
- issues: list of detected problems (e.g., "too short", "ambiguous term")
- If the query is already good, still improve and expand it
"""


class QueryAnalyzerAgent:
    """
    Analyzes and improves user queries before retrieval.
    Generates multiple sub-queries for multi-query retrieval.
    """

    def __init__(self) -> None:
        self._llm = get_llm_service()

    async def analyze(self, query: str) -> dict:
        """
        Analyze a query and return enriched query metadata.

        Args:
            query: Raw user query string

        Returns:
            dict with is_ambiguous, improved_query, sub_queries, issues
        """
        logger.info("Analyzing query", query=query)

        prompt = f"""Analyze this user query for a document retrieval system:

Query: "{query}"

Generate improved query variations for better document retrieval coverage."""

        try:
            result = await self._llm.generate_json(
                prompt=prompt,
                system_prompt=ANALYSIS_SYSTEM_PROMPT,
            )
            # Validate and sanitize output
            return self._sanitize(result, query)
        except Exception as exc:
            logger.warning("Query analysis failed, using fallback", error=str(exc))
            return self._fallback(query)

    def _sanitize(self, result: dict, original: str) -> dict:
        """Ensure all expected fields are present and valid."""
        sub_queries = result.get("sub_queries", [])
        if not isinstance(sub_queries, list) or len(sub_queries) == 0:
            sub_queries = [original]

        return {
            "is_ambiguous": bool(result.get("is_ambiguous", False)),
            "improved_query": str(result.get("improved_query", original)).strip() or original,
            "sub_queries": [str(q).strip() for q in sub_queries[:5] if str(q).strip()],
            "issues": result.get("issues", []),
        }

    def _fallback(self, query: str) -> dict:
        """Return a safe fallback when LLM analysis fails."""
        is_ambiguous = len(query.split()) < 5
        return {
            "is_ambiguous": is_ambiguous,
            "improved_query": query,
            "sub_queries": [query],
            "issues": ["Query analysis unavailable"] if is_ambiguous else [],
        }


def get_query_analyzer() -> QueryAnalyzerAgent:
    """Return a QueryAnalyzerAgent instance."""
    return QueryAnalyzerAgent()
