#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Claude Code SessionStart hook — Catalyst
#
# Ensures node_modules is installed before the agent loop starts, so
# `vite`, `eslint`, and `vitest` all resolve imports on first invocation.
#
# Remote-only (npm install): no-op in local terminal sessions.
# Local + remote (Chrome MCP cleanup): always runs on macOS to kill stale
#   chrome-native-host zombie processes that cause Claude to hang.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Chrome MCP zombie cleanup (local macOS sessions) ──────────────────
# Root cause: chrome-native-host survives Chrome close with a broken pipe.
# Claude's first Chrome MCP call writes to the dead pipe → blocks forever.
# Fix: kill any chrome-native-host older than 5 minutes at session start.
# Chrome spawns a fresh host on the next MCP call — no data loss.
if [[ "$(uname 2>/dev/null || true)" == "Darwin" ]]; then
  STALE_THRESHOLD=300  # 5 minutes — live hosts are short-lived per call
  NOW=$(date +%s)
  PIDS=$(pgrep -f "chrome.native.host\|com\.anthropic\|claude.*browser.*extension" 2>/dev/null || true)
  for PID in $PIDS; do
    START_STR=$(ps -o lstart= -p "$PID" 2>/dev/null | xargs || true)
    [ -z "$START_STR" ] && continue
    START_EPOCH=$(date -j -f "%a %b %d %T %Y" "$START_STR" "+%s" 2>/dev/null || echo "$NOW")
    AGE=$(( NOW - START_EPOCH ))
    if [ "$AGE" -gt "$STALE_THRESHOLD" ]; then
      echo "[session-start] killing stale chrome-native-host PID=$PID age=${AGE}s" >&2
      kill -9 "$PID" 2>/dev/null || true
    fi
  done
fi

# ── npm install (remote sessions only) ────────────────────────────────
# Skip in local terminal sessions — installs belong to the developer there.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "[session-start] installing dependencies for Catalyst"

# Prefer the project's own dep syncer — it already handles the Lovable
# sandbox npm registry 403 by falling back to the public npm registry.
if [ -f scripts/sync-deps.js ]; then
  node scripts/sync-deps.js
else
  # Fallback path for older checkouts that don't carry sync-deps yet.
  if command -v bun >/dev/null 2>&1; then
    bun install --no-summary || npm install --registry=https://registry.npmjs.org
  else
    npm install --registry=https://registry.npmjs.org
  fi
fi

echo "[session-start] ready"
