# Lean CRM

A small B2B sales CRM: browse and search leads, open a lead, log activities, move a
deal through the pipeline, manage follow-up tasks, and generate an AI lead summary.

Next.js 14 (App Router) + TypeScript + Tailwind · FastAPI + SQLAlchemy + Pydantic · SQLite.

> **Status: local demo only.**
> - **Live URL: none — not deployed.** No hosted environment, no production build,
>   no Docker image. Runs on localhost only; follow the Quickstart below.
> - **No authentication.** No login screen, no demo credentials, no sessions. Opening
>   http://localhost:3000 goes straight to the leads list.
> - **No RBAC.** No roles, no permissions, no per-user or per-team scoping — every
>   endpoint is unauthenticated and every caller can read and write every lead.
>
> Deliberate for a single-user demo, and unsafe to expose on a public network as-is.
> See [Assumptions and trade-offs](#assumptions-and-trade-offs) and
> [Known limitations](#known-limitations).

---

## Quickstart

Prerequisites: Python 3.11+ and Node.js 18+.

```bash
cp .env.example .env      # optional: add OPENROUTER_API_KEY for AI summaries
./start.sh
```

`start.sh` creates the backend virtualenv, installs both dependency sets, seeds the
database, and runs the API and the web app together in one foreground shell.

- Web app: http://localhost:3000
- API docs: http://localhost:8000/docs

The app runs fine without an API key — everything except the AI summary works, and the
summary card shows a configuration message rather than breaking.

**Demo login: none.** There is no authentication and no login screen; opening
http://localhost:3000 drops you straight into the leads list. See
[Scope](#scope) for why.

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

`seed.py` is idempotent; see [Sample leads](#sample-leads-seed-data) for details.

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

## The AI lead summary

`POST /api/leads/{id}/summary` — triggered by the **Generate summary** button on a lead
page. Nothing is generated on page load, and summaries are not stored.

### Inputs

The prompt is built by `services/context.py` from the lead's own database rows only — no
web search, no cross-lead data, no ids or internal timestamps:

| Input | Detail |
|---|---|
| Lead identity | Name, job title, status, source |
| Company | Name, industry, size, location |
| Deal | Value, currency, stage (or "no deal recorded") |
| Activities | **5 most recent**, each truncated to **300 characters**, as `date · type · content` |
| Tasks | All tasks, split into open (with due dates) and completed |

Absent fields are rendered as explicit "unknown" text rather than dropped, so the model
can tell a missing value from an unmentioned one.

### Generation

The context is formatted into a labelled plain-text block and sent to OpenRouter
(`OPENROUTER_MODEL`, default `nex-agi/nex-n2.5-mini:free`) at `temperature 0.2` with
`response_format: json_object`. The system prompt requires exactly four fields — `who`,
`important`, `history`, `missing[]` — forbids inventing facts, and caps each section at
two sentences.

Because activity notes are user-generated text, the context is fenced between
`<<<CRM_DATA` markers and labelled as data, with an explicit instruction not to follow
anything inside it. CRM content is data, never instruction.

The response is then treated as untrusted: markdown fences are stripped, JSON is parsed,
a string `missing` is normalised to a list, the result is validated against the
`LeadSummary` Pydantic schema, and a quality gate rejects it if `who`, `important`, or
`history` came back empty. Only output that survives all four steps reaches the UI.

Transport failures (`429` from the free tier's 40 req/min limit, `5xx`, timeouts, network
errors) are retried **3 times with exponential backoff plus jitter**. A non-rate-limit
`4xx` is not retried — it will not fix itself.

### Failure fallback

The summary is the only optional feature; every failure is contained inside the summary
card and nothing else on the page is affected. Each failure mode carries a
machine-readable `code`, and the UI renders a distinct message per code:

| Code | HTTP | Cause | What the user sees |
|---|---|---|---|
| `no_key` | 503 | `OPENROUTER_API_KEY` not set | Configuration hint — set the key to enable summaries |
| `upstream` | 502 | Provider error, timeout, or retries exhausted | Provider-unavailable message, retry offered |
| `invalid_output` | 502 | Response was not valid JSON matching the schema | Bad-output message, retry offered |
| `weak_output` | 502 | Schema-valid but an essential field was empty | Bad-output message, retry offered |

There is **no cached or canned fallback summary** — a failed generation shows an error
and a retry, never stale or fabricated content. With no API key configured the check
happens before any network call, so the app is fully usable offline minus this one card.

---

## Automated tests

API integration tests against the seeded database, using FastAPI's `TestClient`
(stdlib `unittest`, no extra dependency):

```bash
cd backend
.venv/Scripts/python seed.py               # tests read the seeded rows
.venv/Scripts/python -m unittest discover -s tests -v
```

```
Ran 7 tests in 0.316s

OK
```

`backend/tests/test_api.py` covers the health check, listing leads, lead detail, `404`
for an unknown lead, `400` for blank activity content, `422` for an invalid deal stage,
and the task list.

They are read-only or self-contained against `crm.db`, so no separate test database is
needed — but they do assume the seed data is present. The AI summary endpoint is not
covered, since exercising it means either a live API key or a mocking layer; it was
verified manually against both a real key and a missing one. There are no frontend tests.

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

## Sample leads (seed data)

### Loading them

`./start.sh` seeds automatically on startup, so a fresh clone already has data. Manually:

```bash
cd backend
.venv/Scripts/python seed.py           # no-op if leads already exist
.venv/Scripts/python seed.py --force   # wipe and reseed
```

### Accessing them

- **UI:** http://localhost:3000 — the leads list loads them; no login required. Click a
  row for the detail page (activities, deal, tasks, AI summary).
- **API:** `curl localhost:8000/api/leads` — or `?search=Acme`, `?status=qualified`.
- **Database:** `backend/crm.db` (SQLite, gitignored — created by the seed).

### What's in them

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

---

## Assumptions and trade-offs

**Single-user demo, no auth.** Assumed one trusted local user, so there is no login,
no sessions, and no per-user scoping. Trade-off: nothing here is safe to expose on a
public network as-is — every endpoint is unauthenticated, and adding auth later means
touching every route plus the ownership columns.

**SQLite over Postgres.** Zero setup, file-backed, ships in the repo. Trade-off: one
writer at a time and no network access, so it does not survive being scaled out.

**One lead has at most one deal.** Simplifies the schema and the UI, and lets deal stage
and lead status stay in sync. Real pipelines have multiple concurrent deals per account.

**Deal stage drives lead status.** They share a vocabulary, so advancing a deal writes
the lead's status too. Trade-off: they cannot diverge, which real workflows sometimes want.

**No summary persistence or caching.** Summaries are derived data over records that
change, so regenerating is cheaper than invalidating. Trade-off: every view costs an LLM
call and a few seconds of latency. Productionizing means caching keyed on the underlying
records' `updated_at`.

**Free-tier model by default.** Keeps the demo runnable at no cost. Trade-off: the free
tier rate-limits at 40 req/min and returns weaker output, which is why the parse,
schema-validation and quality gates exist at all.

**Server-side LLM calls only.** The API key never reaches the browser; the frontend only
ever talks to the FastAPI backend.

**Timestamps are UTC, formatted in the UI.** No per-user timezone handling.

---

## Known limitations

- **No authentication.** No login, no demo credentials, no sessions, no API keys on the
  endpoints. Anyone who can reach port 8000 has full read and write access to every lead.
- **No RBAC or authorization of any kind.** No roles, no permissions, no record
  ownership, no per-user or per-team data scoping. Adding it later means touching every
  route plus new ownership columns on `leads`.
- **Not deployed — no live URL.** Local development only; no hosted environment, no
  production build pipeline, no Docker image, no CI.
- **SQLite concurrency.** Single-writer; concurrent writes serialize and can block under
  load.
- **No database migrations.** Schema is created from the models at startup. A model
  change means recreating `crm.db` (`python seed.py --force`), which discards data.
- **Search is a `LIKE` scan** over name, company and email — unindexed, case-sensitivity
  depends on SQLite collation, and it will not scale past a few thousand rows.
- **No pagination.** `GET /api/leads` returns every matching lead in one response.
- **AI summary latency and cost are per-click** — typically a few seconds, and no
  caching means repeat views repeat the call.
- **AI summaries can still be shallow.** The gates reject empty or malformed output,
  not merely unhelpful output; a weak free-tier model can return valid-but-thin text.
- **Only the 5 most recent activities reach the prompt**, each cut at 300 characters, so
  a long-running lead's early history is invisible to the summary.
- **No test coverage for the AI path or the frontend**; 7 backend API tests only, and
  they depend on seeded data.
- **No optimistic UI or offline handling.** Mutations wait on the server round-trip, and
  a dropped backend surfaces as an error state.
- **No soft deletes, audit trail, file attachments, bulk actions, or CSV import/export.**

---

## Scope

Intentionally not built: authentication, RBAC, Redis, Celery, Postgres, vector search,
RAG, agent frameworks, WebSockets, notifications, analytics dashboards.
