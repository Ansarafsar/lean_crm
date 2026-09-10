"""Minimal stdlib logging setup.

Console only, no files to manage. Level comes from LOG_LEVEL (default INFO);
SQL_ECHO=1 turns on SQLAlchemy query logging for debugging.
"""

import logging
import os
import sys

LOG_FORMAT = "%(asctime)s %(levelname)-8s [%(name)s] %(message)s"
DATE_FORMAT = "%H:%M:%S"


def setup_logging() -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper()

    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format=LOG_FORMAT,
        datefmt=DATE_FORMAT,
        stream=sys.stdout,
        force=True,
    )

    # Third-party noise. We log our own request lines in middleware.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    sql_level = logging.INFO if os.getenv("SQL_ECHO") == "1" else logging.WARNING
    logging.getLogger("sqlalchemy.engine").setLevel(sql_level)


def truncate(text: str, limit: int = 80) -> str:
    """Keep user-generated content out of the logs at full length."""
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"
