# ÆSCULAPIUS — Self-Healing RAG Platform

<div align="center">
  <img src="frontend/public/logo.jpg" alt="ÆSCULAPIUS Logo" width="130" />
  <br /><br />
  <strong>A production-grade, agentic Retrieval-Augmented Generation (RAG) platform that autonomously detects retrieval failures, rewrites queries, verifies answers, and heals itself — all without human intervention.</strong>
  <br /><br />
  <img src="https://img.shields.io/badge/Python-3.10+-blue?logo=python" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/LangGraph-0.2-orange" />
  <img src="https://img.shields.io/badge/Pinecone-Serverless-purple" />
</div>

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [System Architecture](#-system-architecture)
3. [How It Works — Full Pipeline](#-how-it-works--full-pipeline)
4. [The 8 AI Agents](#-the-8-ai-agents)
5. [Self-Healing Mechanism (Deep Dive)](#-self-healing-mechanism-deep-dive)
6. [Confidence Scoring](#-confidence-scoring)
7. [Features](#-features)
8. [Technology Stack](#-technology-stack)
9. [API Reference](#-api-reference)
10. [Getting Started](#-getting-started)
11. [Security](#-security)
12. [Deployment](#-deployment)

---

## 🌟 Overview

Standard RAG systems are passive — they retrieve what they can and generate an answer regardless of whether the retrieved context is actually relevant. **ÆSCULAPIUS is different.**

It is built around an autonomous, multi-agent feedback loop: after every retrieval, an intelligent **Context Evaluator** grades the quality of the retrieved documents. If the score falls below **0.70**, the system triggers a **Healing Agent** that intelligently rewrites the query, expands the search scope, and retries the retrieval — up to **3 times**. After generation, a separate **Hallucination Verifier** cross-checks every claim in the answer against the source documents.

The result: dramatically fewer hallucinations, measurably better grounding, and a confidence score you can trust.

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ÆSCULAPIUS PLATFORM                          │
│                                                                      │
│  ┌─────────────┐     ┌──────────────────────────────────────────┐   │
│  │   React UI  │────▶│         FastAPI Backend (Python)         │   │
│  │  (Vite/TW)  │     │           /api/v1/* endpoints            │   │
│  └─────────────┘     └──────────────┬───────────────────────────┘   │
│                                     │                                │
│                    ┌────────────────▼────────────────┐              │
│                    │    LangGraph State Machine       │              │
│                    │    (8-Node Agentic Pipeline)     │              │
│                    └────────────────┬────────────────┘              │
│                                     │                                │
│          ┌──────────────────────────┼──────────────────────┐        │
│          │                          │                       │        │
│    ┌─────▼─────┐           ┌────────▼────────┐   ┌────────▼─────┐  │
│    │  Pinecone │           │  BAAI/bge-m3    │   │  Llama 3.1 / │  │
│    │ (Vectors) │           │  (Embeddings)   │   │  Gemini LLM  │  │
│    └───────────┘           └─────────────────┘   └──────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ How It Works — Full Pipeline

Every user query goes through an **8-step agentic pipeline** managed by LangGraph. Each step is a dedicated AI agent with a specific responsibility:

```
User Query
    │
    ▼
[1] ANALYZE QUERY ──── LLM rewrites query + generates 3-5 sub-queries
    │
    ▼
[2] RETRIEVE ────────── Multi-query vector search in Pinecone (Top-K=20)
    │
    ▼
[3] RERANK ──────────── Cross-encoder (bge-reranker-large) sorts by true relevance
    │
    ▼
[4] EVALUATE CONTEXT ── Hybrid heuristic+LLM score (0.0–1.0)
    │
    ├── score < 0.70? ──▶ [5] HEAL ──▶ Rewrite query ──▶ back to [2]
    │                         (up to 3 times, escalating aggressiveness)
    │
    ▼ (score ≥ 0.70 OR max retries reached)
[6] GENERATE ────────── LLM produces a grounded answer with citations
    │
    ▼
[7] VERIFY HALLUCINATION ── LLM-as-judge checks every claim against source
    │
    ├── not grounded? ──▶ back to [6] (one regeneration attempt)
    │
    ▼
[8] SCORE CONFIDENCE ── Weighted formula → final confidence score (0.0–1.0)
    │
    ▼
API Response: { answer, sources, confidence, context_score, is_grounded, healing }
```

---

## 🤖 The 8 AI Agents

### Agent 1 — Query Analyzer
**File:** `backend/app/agents/query_analyzer.py`

Before any retrieval happens, the raw user query is analyzed and enriched by the LLM.

**What it does:**
- Detects ambiguity and vague phrasing
- Rewrites the query to be more specific and retrieval-optimized (10–20 words)
- Generates **3–5 semantically distinct sub-queries** to maximize recall coverage
- Flags detected issues (e.g., "too short", "ambiguous term")

**Why it matters:** A query like *"explain attention"* becomes:
- Improved: *"Explain the self-attention mechanism in transformer neural network architectures"*
- Sub-queries: *"How does multi-head attention work?"*, *"What is the query-key-value mechanism?"*, etc.

---

### Agent 2 — Retrieval Agent
**File:** `backend/app/agents/retrieval_agent.py`

Searches the Pinecone vector database using all sub-queries generated by the analyzer.

**What it does:**
- Embeds all sub-queries using **BAAI/bge-m3** (1024-dimensional dense vectors)
- Runs parallel searches in Pinecone (Top-K=20 per query by default)
- Merges and deduplicates results across all sub-queries
- Applies a `top_k_multiplier` during healing retries to widen the search

**Tech:** Pinecone Serverless, BAAI/bge-m3 embeddings (1024-dim), async parallel queries

---

### Agent 3 — Reranker Agent
**File:** `backend/app/agents/reranker_agent.py` + `backend/app/services/reranker_service.py`

Raw vector similarity (cosine distance) is a poor proxy for true relevance. The reranker fixes this.

**What it does:**
- Scores every `(query, chunk)` pair individually using **BAAI/bge-reranker-large** (cross-encoder)
- Returns the **Top-5** chunks sorted by true semantic relevance
- Cross-encoders see both query and chunk simultaneously, producing much more accurate scores than bi-encoder similarity

**Score normalization:** Sigmoid function maps raw logits to [0, 1] range

---

### Agent 4 — Context Evaluator
**File:** `backend/app/agents/context_evaluator.py`

The "quality gate" of the pipeline. This agent decides whether to proceed to generation or trigger self-healing.

**What it does:**
- **Heuristic score** (40% weight): Based on chunk count and average reranker relevance
  - `score = 0.3 × (chunks/5) + 0.7 × avg_relevance`
- **LLM semantic score** (60% weight): The LLM reads the query + context and scores alignment (0–1)
- **Combined score** = `0.4 × heuristic + 0.6 × LLM_score`
- If `combined_score < 0.70` → **sets `needs_retry=True` → triggers healing**

**Threshold:** Configurable via `CONTEXT_SCORE_THRESHOLD` (default: 0.70)

---

### Agent 5 — Healing Agent
**File:** `backend/app/agents/healing_agent.py`

The core of the self-healing capability. Called when the context evaluator flags insufficient context.

**What it does (per retry attempt):**

| Attempt | Strategy | Top-K Multiplier | Filter Relaxation |
|---------|----------|------------------|-------------------|
| 1st | LLM query rewrite — add domain terms, expand acronyms | 1.5× | None |
| 2nd | Semantic expansion — synonyms, related concepts | 2.0× | None |
| 3rd | Aggressive expansion — maximum breadth | 2.5× | Remove all filters |

- The LLM is given the original query, all previously attempted queries, and the failure score
- It generates a new `rewritten_query` + fresh sub-queries using a different strategy each time
- Queries already tried are excluded from the next attempt

After healing, the pipeline loops back to **Agent 2 (Retrieve)** with the new queries.

---

### Agent 6 — Generator Agent
**File:** `backend/app/agents/generator_agent.py`

Generates the final answer using the Top-5 reranked chunks as grounding context.

**What it does:**
- Builds a structured context window from the ranked chunks (max ~4,000 chars)
- Instructs the LLM to: answer using ONLY the provided context, cite sources, acknowledge gaps
- Returns the generated answer + list of cited chunk IDs

**Prompt design:** The generator is explicitly told to never invent facts beyond the context and to acknowledge uncertainty if the context is insufficient.

---

### Agent 7 — Hallucination Verifier
**File:** `backend/app/agents/hallucination_agent.py`

An independent **LLM-as-judge** that verifies every claim in the generated answer.

**What it does:**
- Sends the query, generated answer, and source chunks to the LLM for cross-verification
- The LLM identifies: unsupported claims, contradictions with context, missing citations
- Produces: `grounding_score` (0–1), `is_grounded` (boolean), and a list of specific issues

**Scoring thresholds:**
- `1.0` — Every claim directly supported
- `0.7–1.0` — Mostly grounded (passes as `is_grounded=True`)
- `0.5–0.7` — Partially grounded → triggers **one regeneration attempt**
- `0.0–0.5` — Significant hallucination → triggers regeneration

Uses **Gemini API** for this step (high-quality judge, separate from the generator LLM).

---

### Agent 8 — Confidence Agent
**File:** `backend/app/agents/confidence_agent.py`

Produces the final, multi-factor confidence score returned to the user.

**Formula:**
```
confidence = (retrieval_score × 0.25)
           + (context_score   × 0.30)
           + (grounding_score × 0.30)
           + (citation_coverage × 0.15)
```

| Factor | Weight | Source |
|--------|--------|--------|
| Retrieval Score | 25% | Average reranker relevance across Top-5 chunks |
| Context Score | 30% | Output of Context Evaluator (Agent 4) |
| Grounding Score | 30% | Output of Hallucination Verifier (Agent 7) |
| Citation Coverage | 15% | % of answer claims with an explicit or implicit citation |

**Interpretation:**
- `≥ 0.85` — High confidence, answer is reliable
- `0.70–0.85` — Moderate confidence, review sources recommended
- `< 0.70` — Low confidence, self-healing was triggered

---

## 🔄 Self-Healing Mechanism (Deep Dive)

The self-healing loop is the defining feature of this platform. Here is the exact sequence when healing is triggered:

```
Query: "How does the reranker improve results?"
                                    │
                           [Retrieve] → 20 chunks
                           [Rerank]   → Top 5
                           [Evaluate] → score = 0.45 ❌ (below 0.70)
                                    │
                          ┌─────────▼──────────────────────────────────┐
                          │  HEALING ATTEMPT 1                         │
                          │  Strategy: Query rewrite                   │
                          │  Rewritten: "Cross-encoder reranking role  │
                          │  in improving RAG retrieval precision"     │
                          │  Top-K multiplier: 1.5× (30 results)      │
                          └─────────┬──────────────────────────────────┘
                                    │ [Retrieve again] → 30 chunks
                                    │ [Rerank] → Top 5
                                    │ [Evaluate] → score = 0.62 ❌
                          ┌─────────▼──────────────────────────────────┐
                          │  HEALING ATTEMPT 2                         │
                          │  Strategy: Semantic expansion              │
                          │  Rewritten: "BAAI bge-reranker-large       │
                          │  bi-encoder vs cross-encoder relevance"   │
                          │  Top-K multiplier: 2.0× (40 results)      │
                          └─────────┬──────────────────────────────────┘
                                    │ [Retrieve again] → 40 chunks
                                    │ [Rerank] → Top 5
                                    │ [Evaluate] → score = 0.81 ✅
                                    │
                           [Generate] → Grounded answer
                           [Verify]   → is_grounded = true
                           [Score]    → confidence = 0.84
```

---

## 📊 Confidence Scoring

Every response includes a rich telemetry object showing how the confidence was derived:

```json
{
  "answer": "...",
  "confidence": 0.84,
  "context_score": 0.81,
  "is_grounded": true,
  "healing": {
    "attempted": true,
    "retries": 2,
    "rewritten_queries": [
      "Cross-encoder reranking role in RAG retrieval",
      "BAAI bge-reranker-large vs bi-encoder"
    ]
  },
  "sources": [
    {
      "document_name": "architecture_guide.pdf",
      "page": 12,
      "relevance_score": 0.91,
      "text_snippet": "..."
    }
  ],
  "processing_time_ms": 3420.5
}
```

---

## ✨ Features

### Core Intelligence
- **Multi-Query Retrieval** — 3–5 sub-queries per user question for maximum recall
- **Cross-Encoder Reranking** — True relevance scoring beyond cosine similarity
- **Autonomous Self-Healing** — Up to 3 query rewrites with escalating strategies
- **Hallucination Detection** — LLM-as-judge verifies every answer claim
- **Multi-Factor Confidence** — 4-component weighted confidence score

### Knowledge Management
- **Multi-Format Ingestion** — PDF, DOCX, TXT, Markdown support
- **Smart Chunking** — 800-token chunks with 150-token overlap for context continuity
- **Persistent Vector Storage** — Pinecone serverless with metadata
- **Document Management** — Upload, index tracking, and purge via UI

### Observability
- **Real-Time Telemetry** — Hallucination rate, latency, healing success rate
- **Search Trace Logging** — Every query tracked with hash, confidence, and status
- **Audit Log Console** — Live system event stream visible in the admin dashboard
- **Session-Level History** — Query history persisted across the current session

### Developer Experience
- **RESTful API** — Full OpenAPI/Swagger documentation at `/docs`
- **Session Tracking** — Stateless session IDs for conversation continuity
- **Structured Logging** — Structlog-based JSON logging with request IDs
- **Rate Limiting** — 100 requests/minute/IP protection layer

### Security
- **Input Validation** — Pydantic v2 models with strict length bounds (`min=2, max=2000`)
- **File Size Limits** — 50 MB maximum upload with MIME type whitelisting
- **CORS Configuration** — Configurable allowed origins for deployment
- **Secret Management** — All credentials via environment variables, never in code

---

## 🔧 Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|------------|---------|
| API Framework | FastAPI 0.115 | Async REST API |
| AI Orchestration | LangGraph 0.2 + LangChain 0.3 | 8-node stateful agent pipeline |
| Embeddings | BAAI/bge-m3 | 1024-dim dense text embeddings |
| Reranker | BAAI/bge-reranker-large | Cross-encoder relevance scoring |
| Vector DB | Pinecone (Serverless) | Scalable vector storage and search |
| LLM (Local) | Llama 3.1 via Ollama | Query analysis, generation, evaluation |
| LLM (Cloud) | Google Gemini 2.5 Flash | Hallucination verification judge |
| Logging | Structlog | Structured JSON logs with request tracing |
| Observability | LangSmith (optional) | LangGraph trace visualization |

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 + Vite | Fast SPA build and HMR |
| Styling | Tailwind CSS | Utility-first responsive design |
| State | Zustand | Lightweight global state management |
| Charts | Recharts | Analytics and telemetry visualizations |
| HTTP | Axios | API communication with interceptors |
| Icons | Lucide React | Consistent iconography |

---

## 📡 API Reference

### `POST /api/v1/chat`
Run a full self-healing RAG query.

**Request:**
```json
{
  "query": "What is the self-attention mechanism?",
  "session_id": "optional-uuid"
}
```

**Response:**
```json
{
  "answer": "Self-attention allows each token...",
  "sources": [{ "document_name": "...", "page": 5, "relevance_score": 0.91 }],
  "confidence": 0.88,
  "context_score": 0.84,
  "is_grounded": true,
  "healing": { "attempted": false, "retries": 0, "rewritten_queries": [] },
  "processing_time_ms": 2340.2,
  "session_id": "abc-123"
}
```

---

### `POST /api/v1/upload`
Ingest a document into the vector knowledge base.

**Request:** `multipart/form-data` with `file` field  
**Supported types:** `.pdf`, `.docx`, `.txt`, `.md`  
**Max size:** 50 MB

**Response:**
```json
{
  "document_id": "doc_abc123",
  "document_name": "architecture.pdf",
  "chunks_indexed": 185,
  "status": "success",
  "message": "Document ingested and indexed successfully"
}
```

---

### `GET /api/v1/health`
System health check — all dependency statuses.

### `GET /api/v1/metrics`
Real-time performance metrics (total queries, hallucination rate, average latency, etc.)

### `GET /api/v1/documents`
List all indexed documents.

### `DELETE /api/v1/documents/{document_id}`
Purge a document and its vectors from Pinecone.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) running locally with `llama3.1:latest`
- Pinecone account (free tier works)

### 1. Clone the Repository
```bash
git clone https://github.com/shivasubrahmanya/Self-Healing-RAG.git
cd Self-Healing-RAG
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

Required keys in `backend/.env`:
```env
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_INDEX=self-healing-rag
GEMINI_API_KEY=your_gemini_api_key_here   # For hallucination verification
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:latest
CORS_ORIGINS=http://localhost:5173
```

### 3. Start the Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API will be live at `http://localhost:8000`  
Docs at `http://localhost:8000/docs`

### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
UI will be live at `http://localhost:5173`

### 5. Docker (All-in-One)
```bash
docker-compose up --build -d
```
Both services start automatically. Access the UI at `http://localhost`.

---

## 🛡️ Security

| Layer | Measure |
|-------|---------|
| API Rate Limiting | 100 requests/min/IP (in-memory token bucket) |
| Input Validation | Pydantic v2 strict models (`min_length=2`, `max_length=2000`) |
| File Upload Guard | 50 MB limit, MIME type whitelist (PDF/DOCX/TXT/MD) |
| Empty File Check | Reject zero-byte files before any processing |
| CORS | Configurable allowed origin whitelist |
| Secret Management | All credentials via `.env` — never hardcoded |
| `.gitignore` | `.env` and sensitive files excluded from version control |

---

## 📦 Deployment

### Docker (Recommended)
```bash
docker-compose up --build -d
```

### Frontend — Vercel
```bash
cd frontend && npm run build
# Push to GitHub and connect to Vercel — auto-deploys on push
```
Set environment variable `VITE_API_URL` to your backend URL.

### Backend — Render / Railway
1. Connect your GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `.env`

> **Note:** The local embedding and reranker models (bge-m3, bge-reranker-large) require ~4GB RAM. For free hosting tiers (512MB RAM), switch to the Gemini embedding API.

---

## 📁 Project Structure

```
Self-Healing-RAG/
├── backend/
│   ├── app/
│   │   ├── agents/              # 8 AI agents (query, retrieval, rerank, eval, heal, gen, verify, score)
│   │   ├── api/routes/          # FastAPI route handlers (chat, upload, health, metrics)
│   │   ├── models/              # Pydantic request/response models
│   │   ├── services/            # Core services (embedding, reranker, LLM, Pinecone, metrics)
│   │   ├── utils/               # Logger, exceptions
│   │   ├── workflows/           # LangGraph pipeline (rag_graph.py)
│   │   ├── config.py            # Centralized settings via pydantic-settings
│   │   └── main.py              # FastAPI app entry, middleware, router registration
│   ├── requirements.txt
│   └── .env                     # Environment variables (not committed)
│
├── frontend/
│   ├── public/                  # Static assets (logo, background)
│   ├── src/
│   │   ├── components/          # Layout, Chat, Upload components
│   │   ├── pages/               # Hub, Chat, Dashboard, Analytics, Admin
│   │   ├── services/api.js      # Axios API client
│   │   ├── store/appStore.js    # Zustand global state
│   │   └── index.css            # Design system (glassmorphism, 3D effects)
│   └── vite.config.js
│
├── docker-compose.yml           # Full stack orchestration
└── README.md
```

---

<div align="center">
  <i>Built with ❤️ by Shivasubrahmanya</i>
  <br />
  <i>"Healing knowledge, one query at a time."</i>
</div>
