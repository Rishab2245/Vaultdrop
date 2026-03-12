# 💀 VAULTDROP

> The Global Secret Economy Platform — Post Secrets. Earn Rewards. Hunt Truth. Stay Anonymous. Forever.

A pixel-art themed anonymous secret marketplace where holders earn from exposing truths and hunters pay to access them.

## Quick Start

### 1. Start infrastructure (Postgres + Redis)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in your keys
npm install
npm run db:migrate
npm run db:seed        # optional: seed sample data
npm run dev
# Runs on http://localhost:4000
# GraphQL playground: http://localhost:4000/graphql
```

### 3. AI Service
```bash
cd ai-service
cp .env.example .env   # fill in OPENAI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Runs on http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 4. Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# Runs on http://localhost:3000
```

## Full Docker Stack
```bash
# Build and start everything
docker-compose up --build

# Stop everything
docker-compose down

# Reset database
docker-compose down -v
docker-compose up --build
```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing session tokens |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `AI_SERVICE_URL` | URL of the AI service |

### AI Service (`ai-service/.env`)
| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o-mini + embeddings |
| `PINECONE_API_KEY` | Pinecone API key (optional for dev) |
| `PINECONE_INDEX_NAME` | Pinecone index name (default: vaultdrop-secrets) |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend GraphQL endpoint |
| `NEXT_PUBLIC_SSE_URL` | Backend SSE base URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_test_...) |

## Architecture

```
frontend (Next.js 14 — port 3000)
    │
    ├── GraphQL → backend (Node.js/Express — port 4000)
    │               ├── PostgreSQL (port 5432)
    │               ├── Redis (port 6379)
    │               ├── Stripe (payments)
    │               └── HTTP → ai-service (Python/FastAPI — port 8000)
    │                           ├── OpenAI API (moderation, scoring, PII, embeddings)
    │                           └── Pinecone (duplicate detection)
    │
    └── SSE streams → backend (live votes, pool total, leaderboard)
```

## Key Features

- **Anonymous identity** — GHOST-XXXX-X codenames, no real data ever collected
- **Daily prize pool** — Post fees + peek fees + vote fees fund a daily prize drawn at midnight UTC
- **Ghost Secrets** — Hidden content with teaser hints; pay to peek or fully unlock
- **VAULT AI** — Semantic duplicate detection, PII redaction, explosive scoring
- **Bowls** — Private/paid communities for targeted secret hunting
- **Pixel art theme** — Full retro 8-bit visual style with Press Start 2P font

## Project Structure

```
vaultdrop/
├── frontend/          # Next.js 14 + Pixel UI
├── backend/           # Node.js + Express + Apollo GraphQL
├── ai-service/        # Python + FastAPI + OpenAI + Pinecone
├── docker-compose.yml         # Full production stack
└── docker-compose.dev.yml     # Dev infrastructure only
```
