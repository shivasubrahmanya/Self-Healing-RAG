# System Rules

1. Never answer without retrieved context.

2. Every answer must cite source chunks.

3. If confidence < 0.70:
   trigger self-healing.

4. If hallucination detected:
   regenerate answer.

5. Maximum retries = 3.

6. If context unavailable:
   return:
   "Insufficient information found."

7. Generator must never invent facts.

8. Retrieval always passes through reranker.