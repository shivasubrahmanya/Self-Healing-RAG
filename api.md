# API Endpoints

POST /upload

Upload PDFs

POST /chat

Body:

{
  "query":"..."
}

Response:

{
  "answer":"...",
  "sources":[],
  "confidence":0.91
}

GET /health

Health Check

GET /metrics

System Metrics