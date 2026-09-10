#!/usr/bin/env bash
# Starts the Lean CRM backend and frontend together.
# Works in Git Bash on Windows and in bash on macOS/Linux.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Windows venvs put binaries in Scripts/, POSIX in bin/.
if [ -d "backend/.venv/Scripts" ]; then
  VENV_BIN="backend/.venv/Scripts"
  PY="$VENV_BIN/python.exe"
else
  VENV_BIN="backend/.venv/bin"
  PY="$VENV_BIN/python"
fi

echo "==> Preparing environment"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "    Created .env from .env.example"
fi
set -a; source .env; set +a

if [ -z "${OPENROUTER_API_KEY:-}" ]; then
  echo "    NOTE: OPENROUTER_API_KEY is not set."
  echo "          The CRM runs fine; AI summaries will show a configuration message."
fi

echo "==> Backend"
if [ ! -d "backend/.venv" ]; then
  echo "    Creating virtualenv"
  python -m venv backend/.venv 2>/dev/null || python3 -m venv backend/.venv
  if [ -d "backend/.venv/Scripts" ]; then
    VENV_BIN="backend/.venv/Scripts"; PY="$VENV_BIN/python.exe"
  else
    VENV_BIN="backend/.venv/bin"; PY="$VENV_BIN/python"
  fi
fi

echo "    Installing dependencies"
"$PY" -m pip install --quiet --upgrade pip
"$PY" -m pip install --quiet -r backend/requirements.txt

echo "    Seeding database"
(cd backend && "../$PY" seed.py)

echo "    Starting API on http://localhost:8000"
(cd backend && "../$PY" -m uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

# Stop the API when this script exits, however it exits.
cleanup() {
  echo ""
  echo "==> Shutting down"
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> Frontend"
if [ ! -d "frontend/node_modules" ]; then
  echo "    Installing dependencies (first run, this takes a minute)"
  (cd frontend && npm install --silent)
fi

echo "    Starting web app on http://localhost:3000"
echo ""
(cd frontend && npm run dev)
