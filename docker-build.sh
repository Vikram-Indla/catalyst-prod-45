#!/usr/bin/env bash
set -euo pipefail

# Load VITE_* vars from .env and pass them to docker build as --build-arg.
# Usage: ./docker-build.sh [extra docker build args...]

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo ".env not found in $(pwd)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

DOCKER_BUILDKIT=1 docker build \
  --build-arg VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-}" \
  --build-arg VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-}" \
  --build-arg VITE_ENABLE_AI="${VITE_ENABLE_AI:-}" \
  --build-arg VITE_ENABLE_HEAVY_EXPORTS="${VITE_ENABLE_HEAVY_EXPORTS:-}" \
  --build-arg VITE_ENABLE_WIKI="${VITE_ENABLE_WIKI:-}" \
  --build-arg VITE_ENABLE_KNOWLEDGE_HUB="${VITE_ENABLE_KNOWLEDGE_HUB:-}" \
  --build-arg VITE_ENABLE_FULL_APP="${VITE_ENABLE_FULL_APP:-}" \
  --build-arg VITE_ENABLE_KANBAN_V2="${VITE_ENABLE_KANBAN_V2:-}" \
  -t catalyst-frontend \
  "$@" \
  .
