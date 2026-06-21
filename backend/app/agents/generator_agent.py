"""
Agent 6: Generator Agent

Responsibilities (from agents.md + rules.md):
  - Answer ONLY from retrieved context (never invent facts)
  - Provide citations in every response
  - If context is unavailable, return "Insufficient information found."
  - Structure: Response + Sources + Confidence
"""
from __future__ import annotations

from app.services.llm_service import get_llm_service
from app.services.reranker_service import RankedChunk
from app.utils.logger import get_logger

logger = get_logger(__name__)

GENERATOR_SYSTEM_PROMPT = """You are a precise, reliable AI assistant powered by a Self-Healing RAG system.

CRITICAL RULES (you must follow these without exception):
1. Answer ONLY using the provided context chunks. NEVER invent or assume facts.
2. Every factual claim must reference a specific chunk using [Document Name, Page X] format.
3. If the context does not contain enough information to answer, respond with:
   "Insufficient information found in the provided documents."
4. Be concise but thorough. Structure complex answers with bullet points.
5. Do not repeat context verbatim — synthesize and explain clearly.

Citation format: [Document Name, Page X]
Example: "Transformers use self-attention [Attention Is All You Need, Page 3]."
"""


class GeneratorAgent:
    """
    Generates context-grounded answers with mandatory citations.

    Enforces the core rule: never answer without retrieved context.
    All claims are cited to specific document chunks.
    """

    def __init__(self) -> None:
        self._llm = get_llm_service()

    async def generate(
        self,
        query: str,
        ranked_chunks: list[RankedChunk],
    ) -> dict:
        """
        Generate a grounded answer from the ranked context chunks.

        Args:
            query        : The user's query (improved version)
            ranked_chunks: Top-N reranked chunks as context

        Returns:
            dict with:
              - answer: str (generated text with inline citations)
              - cited_chunks: list[str] (chunk_ids referenced)
              - context_used: str (the context fed to the LLM)
        """
        if not ranked_chunks:
            logger.warning("Generator called with no chunks — returning fallback")
            return {
                "answer": "Insufficient information found in the provided documents.",
                "cited_chunks": [],
                "context_used": "",
            }

        context_text = self._build_context(ranked_chunks)
        prompt = self._build_prompt(query, context_text)

        logger.info("Generating answer", query=query, context_chunks=len(ranked_chunks))

        try:
            answer = await self._llm.generate(
                prompt=prompt,
                system_prompt=GENERATOR_SYSTEM_PROMPT,
                temperature=0.1,
                use_gemini=True,
            )
        except Exception as exc:
            logger.error("Answer generation failed", error=str(exc))
            answer = "An error occurred during answer generation. Please try again."

        # Extract which chunk IDs were cited (by checking document names in answer)
        cited_chunks = self._extract_citations(answer, ranked_chunks)

        logger.info(
            "Answer generated",
            answer_length=len(answer),
            citations=len(cited_chunks),
        )

        return {
            "answer": answer,
            "cited_chunks": cited_chunks,
            "context_used": context_text,
        }

    def _build_context(self, chunks: list[RankedChunk]) -> str:
        """Format chunks into a numbered context block for the prompt."""
        parts = []
        for i, chunk in enumerate(chunks, start=1):
            parts.append(
                f"[CHUNK {i}] Source: {chunk.document_name}, Page {chunk.page}\n"
                f"Relevance: {chunk.relevance_score:.2f}\n"
                f"{chunk.text}"
            )
        return "\n\n---\n\n".join(parts)

    def _build_prompt(self, query: str, context: str) -> str:
        return f"""Use the following document chunks to answer the user's question.
Cite every fact using [Document Name, Page X] format.

=== CONTEXT CHUNKS ===
{context}

=== USER QUESTION ===
{query}

=== YOUR ANSWER ==="""

    def _extract_citations(
        self, answer: str, chunks: list[RankedChunk]
    ) -> list[str]:
        """Identify which chunk_ids are referenced in the generated answer."""
        cited = []
        for chunk in chunks:
            # Simple heuristic: if document name appears in answer, it's cited
            if chunk.document_name.lower() in answer.lower():
                cited.append(chunk.chunk_id)
        return cited


def get_generator_agent() -> GeneratorAgent:
    """Return a GeneratorAgent instance."""
    return GeneratorAgent()
