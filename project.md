# Self-Healing RAG

Goal:
Build a production-ready Self-Healing RAG system capable of detecting retrieval failures, hallucinations, and insufficient context, then autonomously repairing the retrieval process before generating answers.

Core Features:

- PDF ingestion
- Pinecone vector database
- BGE-M3 embeddings
- Hybrid retrieval
- Query rewriting
- Multi-query retrieval
- Reranking
- Context evaluation
- Hallucination detection
- Citation generation
- Confidence scoring

Tech Stack:

Frontend:
- React
- Tailwind

Backend:
- FastAPI

LLM:
- Ollama
- Llama3:8b

Embeddings:
- BAAI/bge-m3

Vector DB:
- Pinecone

Orchestration:
- LangGraph

Evaluation:
- RAGAS
- LangSmith

Deployment:
- Docker