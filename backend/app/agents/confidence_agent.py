"""
Agent 8: Confidence Agent

Responsibilities (from agents.md + PDF PRD):
  - Compute overall confidence score from multiple signals
  - Factors: retrieval relevance, context completeness, hallucination score, citation coverage

Final confidence is a weighted average of:
  1. Retrieval score    (avg reranker relevance)       - weight 0.25
  2. Context score     (from Context Evaluator)        - weight 0.30
  3. Grounding score   (from Hallucination Verifier)   - weight 0.30
  4. Citation coverage (% of answer chunks cited)      - weight 0.15

From rules.md: confidence < 0.70 → self-healing was (or should be) triggered.
"""
from __future__ import annotations

from app.services.reranker_service import RankedChunk
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Confidence factor weights (must sum to 1.0)
WEIGHTS = {
    "retrieval": 0.25,
    "context": 0.30,
    "grounding": 0.30,
    "citation": 0.15,
}


class ConfidenceAgent:
    """
    Computes a final confidence score by combining signals from all pipeline stages.

    The confidence score directly maps to answer reliability:
      >= 0.85 : High confidence — answer is reliable
      0.70-0.85: Moderate confidence — review sources recommended
      < 0.70  : Low confidence — healing should have been triggered
    """

    async def compute(
        self,
        ranked_chunks: list[RankedChunk],
        context_score: float,
        grounding_score: float,
        cited_chunk_ids: list[str],
        answer: str,
    ) -> dict:
        """
        Compute the final confidence score.

        Args:
            ranked_chunks  : Top-N reranked context chunks
            context_score  : Score from ContextEvaluatorAgent
            grounding_score: Score from HallucinationAgent
            cited_chunk_ids: Chunk IDs referenced in the answer
            answer         : Generated answer text

        Returns:
            dict with:
              - confidence: float (0–1, final score)
              - retrieval_score: float
              - context_score: float
              - grounding_score: float
              - citation_coverage: float
              - breakdown: dict (individual factor scores)
        """
        # Factor 1: Retrieval quality (avg reranker score)
        if ranked_chunks:
            retrieval_score = sum(c.relevance_score for c in ranked_chunks) / len(ranked_chunks)
        else:
            retrieval_score = 0.0

        # Factor 2: Context completeness (passed in from evaluator)
        ctx_score = max(0.0, min(1.0, context_score))

        # Factor 3: Grounding / hallucination score (passed in from verifier)
        grd_score = max(0.0, min(1.0, grounding_score))

        # Factor 4: Citation coverage
        citation_coverage = self._compute_citation_coverage(
            cited_chunk_ids, ranked_chunks, answer
        )

        # Weighted final confidence
        confidence = (
            WEIGHTS["retrieval"] * retrieval_score
            + WEIGHTS["context"] * ctx_score
            + WEIGHTS["grounding"] * grd_score
            + WEIGHTS["citation"] * citation_coverage
        )
        confidence = round(min(max(confidence, 0.0), 1.0), 4)

        breakdown = {
            "retrieval_score": round(retrieval_score, 4),
            "context_score": round(ctx_score, 4),
            "grounding_score": round(grd_score, 4),
            "citation_coverage": round(citation_coverage, 4),
        }

        logger.info(
            "Confidence computed",
            confidence=confidence,
            **breakdown,
        )

        return {
            "confidence": confidence,
            **breakdown,
        }

    def _compute_citation_coverage(
        self,
        cited_ids: list[str],
        chunks: list[RankedChunk],
        answer: str,
    ) -> float:
        """
        Estimate citation coverage:
          = number of chunks referenced in answer / total chunks available.

        Also considers keyword presence as a proxy for implicit citation.
        """
        if not chunks:
            return 0.0
        if not answer:
            return 0.0

        # Explicit citations (chunk_id matched)
        explicit = len(set(cited_ids) & {c.chunk_id for c in chunks})

        # Implicit: document name appears in answer
        implicit = sum(
            1 for c in chunks if c.document_name.lower() in answer.lower()
        )

        cited = max(explicit, implicit)
        coverage = cited / len(chunks)
        return min(coverage, 1.0)


def get_confidence_agent() -> ConfidenceAgent:
    """Return a ConfidenceAgent instance."""
    return ConfidenceAgent()
