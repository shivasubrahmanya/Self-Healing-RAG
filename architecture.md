# Architecture

User
 ↓
FastAPI
 ↓
Query Analyzer
 ↓
Multi Query Generator
 ↓
Embedding Generator
 ↓
Pinecone Retrieval
 ↓
BGE Reranker
 ↓
Context Evaluator

IF CONTEXT BAD
    ↓
Query Rewrite
    ↓
Retrieve Again
    ↓
Rerank Again

ELSE
    ↓
Llama3 Generator
    ↓
Hallucination Verifier
    ↓
Citation Generator
    ↓
Confidence Calculator
    ↓
Response

Maximum Healing Attempts = 3