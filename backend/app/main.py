import logging
import os
import time
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from app.logging_config import setup_logging  # noqa: E402

setup_logging()

from app.database import Base, engine  # noqa: E402
from app.models import Activity, Deal, Lead, Task  # noqa: E402,F401
from app.routes import activities, ai, deals, leads, tasks  # noqa: E402

logger = logging.getLogger(__name__)

FRONTEND_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if o.strip()
]

app = FastAPI(title="Lean CRM API", version="1.0.0")

# Deliberately scoped to the local frontend rather than "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = uuid.uuid4().hex[:6]
    started = time.perf_counter()

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - started) * 1000
    line = "%s %s -> %d (%.0fms) [req %s]"
    args = (
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )

    if response.status_code >= 500:
        logger.error(line, *args)
    elif response.status_code >= 400:
        logger.warning(line, *args)
    else:
        logger.info(line, *args)

    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Full detail to the server log, nothing internal to the client."""
    logger.exception("unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again."},
    )


app.include_router(leads.router)
app.include_router(activities.router)
app.include_router(deals.router)
app.include_router(tasks.router)
app.include_router(ai.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    logger.info("database ready")
    logger.info(
        "AI summaries %s",
        "enabled" if os.getenv("OPENROUTER_API_KEY", "").strip() else "disabled (no API key)",
    )
    logger.info("CORS origins: %s", ", ".join(FRONTEND_ORIGINS))


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
