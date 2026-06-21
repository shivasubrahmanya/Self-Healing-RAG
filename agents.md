# Agents

1. Query Analyzer Agent

Responsibilities:
- detect ambiguity
- detect short queries
- improve searchability

---

2. Retrieval Agent

Responsibilities:
- retrieve top-k chunks
- perform hybrid search

---

3. Reranker Agent

Responsibilities:
- rerank retrieved chunks
- return best context

---

4. Context Evaluator Agent

Responsibilities:
- determine if context is sufficient

Output:

{
  "score":0.82,
  "needs_retry":false
}

---

5. Healing Agent

Responsibilities:
- rewrite query
- expand search
- retry retrieval

Max Retries = 3

---

6. Generator Agent

Responsibilities:
- answer only from context
- provide citations

---

7. Hallucination Agent

Responsibilities:
- verify answer grounding
- detect unsupported claims

---

8. Confidence Agent

Responsibilities:
- compute confidence score