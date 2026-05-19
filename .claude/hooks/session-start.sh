#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Claude Code SessionStart hook — Catalyst
#
# Ensures node_modules is installed before the agent loop starts, so
# `vite`, `eslint`, and `vitest` all resolve imports on first invocation.
#
# Remote-only: no-op in local terminal sessions (see $CLAUDE_CODE_REMOTE).
# Synchronous: the session waits for this to finish — guarantees no race
# between Claude's first tool call and an in-flight install.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

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
