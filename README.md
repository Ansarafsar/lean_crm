# Lean CRM

A small B2B sales CRM: browse and search leads, open a lead, log activities, move a
deal through the pipeline, manage follow-up tasks, and generate an AI lead summary.

Next.js 14 (App Router) + TypeScript + Tailwind · FastAPI + SQLAlchemy + Pydantic · SQLite.

---

## Quickstart

```bash
cp .env.example .env      # optional: add OPENROUTER_API_KEY for AI summaries
./start.sh
```

- Web app: http://localhost:3000
- API docs: http://localhost:8000/docs

The app runs fine without an API key — everything except the AI summary works, and the
summary card shows a configuration message rather than breaking.

### Running the two halves separately

```bash
# Backend
cd backend
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python seed.py
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

`python seed.py` is idempotent; `python seed.py --force` wipes and reseeds.

---

## Architecture

```
Browser  ──►  Next.js (TanStack Query)  ──REST/JSON──►  FastAPI
                                                          │
                                              ┌───────────┴───────────┐
                                              ▼                       ▼
                                           SQLite                OpenRouter
                                      (CRM state of record)     (AI summary)
```

One FastAPI application, no microservices. All CRM state lives in SQLite; the frontend
holds no durable state of its own.

```
backend/app/
  main.py            app wiring, CORS, request logging, exception handling
  logging_config.py  stdlib logging setup
  database.py        engine, session, FK enforcement
  models/            SQLAlchemy: lead, activity, deal, task
  schemas/           Pydantic contracts, incl. the AI output contract
  routes/            leads, activities, deals, tasks, ai
  services/
    context.py       builds the controlled LLM context
    ai_summary.py    OpenRouter call, retry/backoff, parse, validate
```

---

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/leads` | `?search=` (name / company / email), `?status=` |
| GET | `/api/leads/{id}` | |
| GET | `/api/leads/{id}/activities` | Newest first |
| POST | `/api/leads/{id}/activities` | Blank content → `400` |
| GET | `/api/leads/{id}/deal` | |
| PATCH | `/api/deals/{id}` | Unknown stage → `422` |
| GET | `/api/leads/{id}/tasks` | Open first, then by due date |
| POST | `/api/leads/{id}/tasks` | |
| PATCH | `/api/tasks/{id}` | Complete / uncomplete |
| POST | `/api/leads/{id}/summary` | AI summary |

Stages and statuses: `new · contacted · qualified · proposal · won · lost`.
Activity types: `note · call · email · meeting`.

---

## Design decisions

**A controlled AI context, not a database dump.** `services/context.py` builds a small,
explicit object — identity, company, deal, the five most recent activities (truncated),
and open/completed tasks. No ids, no internal timestamps, no raw ORM objects. The prompt
is a deliberate artifact, so it stays reviewable and cheap.

**Model output is untrusted.** Every response is parsed, validated against a Pydantic
schema, then quality-checked (`who` / `important` / `history` must be non-empty). Anything
that fails is rejected rather than rendered. Failures carry a machine-readable `code`, so
the UI can distinguish "no API key" from "the model returned nonsense" and say something
useful in each case.

**Prompt injection is treated as a real risk.** Activity notes are user-generated text
that ends up in a prompt. The context is fenced and explicitly labelled as data, and the
model is told not to follow instructions found inside it. CRM content is data, never
instruction.

**Retry with exponential backoff.** The free OpenRouter tier rate-limits at 40 req/min, so
the client retries `429` and `5xx` three times with backoff and jitter — and never retries
a `4xx` that won't fix itself.

**Summaries are not persisted.** They're derived data over CRM state that changes;
regeneration is cheap, and not storing them avoids stale-summary invalidation entirely.
Productionizing would mean caching keyed on the underlying records' `updated_at`.

**Persistence over features.** Every mutation writes to SQLite and every view reads back
from it. TanStack Query invalidates after each mutation, so no component owns durable
state and a refresh always reflects the database.

**Foreign keys are actually enforced.** SQLite ignores them unless asked, so a `connect`
listener issues `PRAGMA foreign_keys=ON` per connection. Nested routes resolve the parent
lead first, so a bad id is a clean `404` rather than an integrity error.

**Deal stage and lead status are kept in sync.** They share a vocabulary and sit next to
each other in the leads table, so advancing a deal updates the lead's status too.

---

## Logging

Stdlib `logging` to stdout — no files, no extra dependencies.

```
01:29:53 INFO     [app.routes.deals] deal stage lead=4 deal=4 new -> qualified
01:29:53 INFO     [app.main] PATCH /api/deals/4 -> 200 (19ms) [req a2b622]
01:30:17 WARNING  [app.main] POST /api/leads/1/activities -> 400 (3ms) [req 36bf45]
01:30:17 WARNING  [app.services.ai_summary] summary skipped lead=1: OPENROUTER_API_KEY not set
```

One line per request (method, path, status, duration, request id), plus mutations, AI
retry/backoff attempts and outcomes, and full tracebacks for unhandled errors — while the
client only ever receives a generic message. 4xx logs at `WARNING`, 5xx at `ERROR`.

`LOG_LEVEL=DEBUG` raises verbosity; `SQL_ECHO=1` turns on SQLAlchemy query logging. The API
key is never logged, and activity content is truncated to 80 characters.

---

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | _(empty)_ | Enables AI summaries. Server-side only. |
| `OPENROUTER_MODEL` | `nex-agi/nex-n2.5-mini:free` | Model id |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Frontend → backend |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Explicit allowlist, not `*` |
| `LOG_LEVEL` | `INFO` | |
| `SQL_ECHO` | `0` | `1` logs SQL |

---

## Seed data

Five leads, deliberately uneven — that's what makes the AI's "what's missing" section
meaningful:

| Lead | Company | Stage | Value | History |
|---|---|---|---|---|
| Sarah Chen | Acme Analytics | Proposal | $18,000 | Rich: discovery, product overview, follow-up call. Budget, timeline and decision maker all unknown. |
| Arjun Mehta | Northstar Labs | Contacted | $8,000 | Inbound request, one email, no reply. |
| Priya Nair | GreenGrid | Proposal | $24,000 | Discovery, technical evaluation, proposal requested. |
| Daniel Brooks | Vertex Systems | New | $35,000 | Almost nothing — a conference badge scan. |
| Maya Patel | BrightWorks | Won | $12,000 | Closed deal with a complete history. |

---

## Verifying it works

Persistence — the point of the demo. Do each, then hard-refresh:

| Action | Expected after refresh |
|---|---|
| Add an activity | Still in the timeline |
| Move a deal stage | New stage still selected |
| Create a task | Task still listed |
| Complete a task | Still completed |

Error contracts:

```bash
curl -X POST localhost:8000/api/leads/1/activities \
  -H 'Content-Type: application/json' -d '{"type":"note","content":"  "}'    # 400
curl -X PATCH localhost:8000/api/deals/1 \
  -H 'Content-Type: application/json' -d '{"stage":"random_stage"}'          # 422
curl localhost:8000/api/leads/999                                            # 404
curl -X POST localhost:8000/api/leads/1/summary   # 503 + code:no_key without a key
```

## Scope

Intentionally not built: authentication, RBAC, Redis, Celery, Postgres, vector search,
RAG, agent frameworks, WebSockets, notifications, analytics dashboards.
