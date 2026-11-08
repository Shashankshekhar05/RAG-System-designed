# TokenSaver RAG

> **Rule: Cloud = 0 Rs | 100% Local Infrastructure | Zero Paid Services**

TokenSaver RAG is a production-grade, local-first Retrieval-Augmented Generation system engineered to eliminate cloud API costs through multi-level caching (exact hash + semantic vector match), local embeddings, and asynchronous email query fulfillment.

---

## Tech Stack (Locked)

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Backend**: Python 3.11 + FastAPI + Uvicorn
- **Database**: PostgreSQL 16 (Docker)
- **Cache & Queue**: Redis 7 (Docker)
- **Vector DB**: Qdrant (`qdrant/qdrant:latest`, Docker)
- **Embedding**: Local Python `sentence-transformers` (`all-MiniLM-L6-v2`, 384-dim, 0 cloud calls)
- **LLM**: Grok Free Tier (`grok-beta`)
- **Queue**: Redis List (`email_callback_queue`, no Celery needed)
- **Email**: Free Gmail SMTP (Port 587, STARTTLS)

---

## Clean Service Scaffolding

```text
tokensaver-rag/
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Landing Page
│   │   ├── login/page.tsx         # Login Page UI
│   │   ├── chat/page.tsx          # Chat Page UI
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ChatBox.tsx            # Chat conversation component
│   │   ├── PdfList.tsx            # Document list component
│   │   └── UploadModal.tsx        # Upload dropzone modal
│   └── lib/api.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI lifecycle & routers
│   │   ├── config.py              # Settings from .env
│   │   ├── db.py                  # SQLAlchemy engine & sessionmaker
│   │   ├── redis_client.py        # Redis connection & health helper
│   │   ├── qdrant_client.py       # Qdrant client & health helper
│   │   │
│   │   ├── models/                # SQLAlchemy models (auto-created)
│   │   │   ├── user.py            # users table
│   │   │   ├── document.py        # documents table
│   │   │   ├── chat.py            # chat_sessions & messages tables
│   │   │   └── email_job.py       # email_jobs table
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── upload.py
│   │   │   ├── chat.py
│   │   │   └── health.py          # GET /health
│   │   │
│   │   ├── services/              # 11 Dedicated Single-Responsibility Folders
│   │   │   ├── auth_service/
│   │   │   ├── pdf_upload/
│   │   │   ├── parsing/
│   │   │   ├── chunking/
│   │   │   ├── embedding/
│   │   │   ├── retrieval/
│   │   │   ├── cache/
│   │   │   ├── guardrails/
│   │   │   ├── llm/
│   │   │   ├── email_callback/
│   │   │   └── ingestion/
│   │   │
│   │   └── utils/
│   │       ├── logger.py
│   │       └── helpers.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
├── .env
└── README.md
```

---

## Quickstart

### 1. Launch All Services via Docker

```bash
docker compose up -d
# or
docker-compose up -d
```

This brings up 5 containers:
1. `tokensaver_postgres` on port `5432`
2. `tokensaver_redis` on port `6379`
3. `tokensaver_qdrant` on ports `6333` & `6334`
4. `tokensaver_backend` on port `8000`
5. `tokensaver_frontend` on port `3000`

---

## Verification Endpoints

| Service | URL | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | Landing, Login, & Chat UI |
| **Backend Health** | [http://localhost:8000/health](http://localhost:8000/health) | Live connection check for Postgres, Redis, Qdrant |
| **FastAPI Swagger Docs**| [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API documentation |
| **Qdrant Dashboard** | [http://localhost:6333/dashboard](http://localhost:6333/dashboard) | Web interface for Qdrant vector database |

---

## Health Check Sample Output

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "ok",
  "postgres": "connected",
  "redis": "connected",
  "qdrant": "connected"
}
```

*Note: Even if one or more services are disconnected, the health endpoint gracefully returns `"status": "ok"` without crashing the server.*

---

## Email Callback & Fallback Architecture (Milestone 4)

When Grok hits rate limits, timeouts, or API downtime:
1. **Zero Waiting**: Query is immediately queued in Redis List (`email_callback_queue`).
2. **Instant UI Feedback**: ChatBox displays an amber notification: `⏳ Grok Busy Hai - Answer Email Pe Aa Jayega`.
3. **Background Worker**: A lightweight async worker running within the FastAPI lifespan:
   - Waits 2 minutes (`WORKER_RETRY_DELAY = 120s`) for API rate limits to reset.
   - Re-runs Hybrid Retrieval and Keyword Re-Ranking to Top 3 chunks.
   - Retries Grok generation and runs Output Grounding Guardrails.
   - Caches safe answers in Redis Exact + Semantic Cache.
   - Updates `messages` and `email_jobs` tables in PostgreSQL.
   - Dispatches a dark-mode styled HTML email via Gmail SMTP with direct `Open in Chat` button and citations.
4. **Retry Limit & Fail-Safe**: If retries exceed 2 attempts, sends a failure notice email without losing the question record.

---

## Environment Variables Configuration

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=postgresql://tokensaver:tokensaver_secret@postgres:5432/tokensaver_db

# Redis
REDIS_URL=redis://redis:6379/0

# Qdrant Vector DB
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# JWT Auth
JWT_SECRET=super_secret_jwt_key_tokensaver_rag_2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# LLM (Grok Free Tier)
GROK_API_KEY=your_xai_grok_free_tier_key
GROK_MODEL=grok-beta

# Free Email SMTP (Gmail App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_digit_gmail_app_password

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

---

## Database Schemas (Auto-Generated on Startup)

- **`users`**: `id` (UUID), `email` (unique), `password_hash`, `created_at`
- **`documents`**: `id` (UUID), `user_id` (FK), `file_name`, `status`, `total_chunks`, `created_at`
- **`chat_sessions`**: `id` (UUID), `user_id` (FK), `doc_id` (FK), `created_at`
- **`messages`**: `id` (UUID), `session_id` (FK), `question`, `answer`, `tokens_used`, `cache_hit`, `status`, `latency_ms`, `created_at`
- **`email_jobs`**: `id` (UUID), `message_id` (FK), `to_email`, `status`, `retry_count`, `created_at`

