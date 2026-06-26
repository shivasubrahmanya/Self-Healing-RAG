# ÆSCULAPIUS - Self-Healing RAG Platform

<div align="center">
  <img src="frontend/public/logo.jpg" alt="ÆSCULAPIUS Logo" width="120" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);" />
</div>

<p align="center">
  <strong>An advanced, production-ready Retrieval-Augmented Generation (RAG) platform with autonomous self-healing, real-time telemetry, and enterprise-grade security.</strong>
</p>

---

## 🌟 Overview

ÆSCULAPIUS is a state-of-the-art enterprise knowledge base system powered by advanced AI and vector search. It doesn't just retrieve documents—it proactively detects when context is insufficient, autonomously rewrites queries, and heals the context retrieval loop to ensure highly accurate, hallucination-free answers.

## ✨ Key Features

- **Autonomous Self-Healing Pipeline:** Built with **LangGraph**, the system evaluates the retrieved context. If the relevance falls below a configured threshold (e.g., 0.70), it automatically rewrites the query, expands the search scope, and retries.
- **Robust Ingestion Engine:** Upload PDF, DOCX, TXT, and Markdown files. Documents are smartly chunked, embedded using **BAAI/bge-m3**, and ingested into a **Pinecone** vector database.
- **Cross-Encoder Reranking:** Leverages **BAAI/bge-reranker-large** for hyper-precise contextual alignment after initial dense retrieval.
- **Hallucination Detection:** Built-in judge agents verify the final generated answer (using **Llama 3.1**) against the source context to ensure absolute grounding and calculate a confidence score.
- **Live Telemetry & Diagnostics:** A beautiful, responsive React dashboard built with **Tailwind CSS** and **Recharts**. Monitor system latency, knowledge drift, hallucination rates, and search traces in real-time.
- **Enterprise Security:** Hardened with FastAPI-based API rate limiting, robust input validation, and secure secrets management.

---

## 🏗️ Architecture Stack

### Backend 🧠
- **Framework:** FastAPI (Python 3.10+)
- **AI Orchestration:** LangChain & LangGraph
- **Embeddings:** BAAI/bge-m3 (HuggingFace)
- **Reranker:** Cross-Encoder (BAAI/bge-reranker-large)
- **Vector Storage:** Pinecone (Serverless)
- **LLM Node:** Llama 3.1 (via Ollama or remote provider)

### Frontend 💻
- **Framework:** React + Vite
- **Styling:** Tailwind CSS (with custom 3D glassmorphism designs)
- **Charts/Icons:** Recharts, Lucide-React
- **State Management:** Zustand

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- Docker & Docker Compose (Optional, for containerized deployment)
- Pinecone API Key
- Ollama running locally (for `llama3.1:latest`)

### 1. Clone & Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:
```env
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=us-east-1
# Add other necessary API keys for LangSmith, etc.
```

Start the Backend Server:
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Docker Deployment 🐳
The entire stack is deploy-ready. Ensure Docker is installed and run:
```bash
docker-compose up --build -d
```
Access the application at `http://localhost`.

---

## 🛡️ Security & Scalability

- **Rate Limiting:** Protects the AI pipeline from abuse via custom in-memory token buckets on the FastAPI layer.
- **Strict Validations:** Pydantic models strictly bound payload sizes and input dimensions. File uploads are guarded against malicious execution.
- **Secure Configurations:** All sensitive keys are excluded from source control and injected securely at runtime via environment variables.

---

<p align="center">
  <i>"Healing knowledge, one query at a time."</i>
</p>
