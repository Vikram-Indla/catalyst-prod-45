#!/usr/bin/env bash
# promote-to-production.sh
#
# Promotes main → production branch (triggers Vercel deploy + prod migration CI).
# This is the ONLY path to production. Never push directly to `production` branch.
#
# Usage:
#   ./scripts/promote-to-production.sh
#   ./scripts/promote-to-production.sh --skip-confirm   (CI/automation only)

set -e

PROD_BRANCH="production"
SOURCE_BRANCH="main"
PROD_PROJECT="lmqwtldpfacrrlvdnmld"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[promote]${NC} $1"; }
warn() { echo -e "${YELLOW}[promote]${NC} $1"; }
die()  { echo -e "${RED}[promote] ERROR:${NC} $1"; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────────────────────

current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "$SOURCE_BRANCH" ]; then
  die "Must be on '$SOURCE_BRANCH' to promote. Currently on '$current_branch'."
fi

git fetch origin
local_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse "origin/$SOURCE_BRANCH" 2>/dev/null || echo "")
if [ "$local_sha" != "$remote_sha" ]; then
  die "Local $SOURCE_BRANCH is not synced with origin. Run 'git pull' first."
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  die "Uncommitted changes detected. Commit or stash before promoting."
fi

# ── Show what will promote ────────────────────────────────────────────────────

warn "═══════════════════════════════════════════════════════"
warn "  PROMOTING main → production"
warn "  This will deploy to KSA-Catalyst.com"
warn "  and apply any new migrations to PRODUCTION DB"
warn "  Project: $PROD_PROJECT"
warn "═══════════════════════════════════════════════════════"
echo ""

# Show commits that will promote (those not yet on production branch)
if git show-ref --verify --quiet "refs/remotes/origin/$PROD_BRANCH"; then
  new_commits=$(git log "origin/$PROD_BRANCH..HEAD" --oneline 2>/dev/null || echo "")
  if [ -z "$new_commits" ]; then
    warn "No new commits to promote. Production is already up to date."
    exit 0
  fi
  echo "Commits to promote:"
  git log "origin/$PROD_BRANCH..HEAD" --oneline
  echo ""

  # Show new migrations
  new_migrations=$(git diff "origin/$PROD_BRANCH..HEAD" --name-only -- 'supabase/migrations/' 2>/dev/null || echo "")
  if [ -n "$new_migrations" ]; then
    warn "New migrations to apply to PRODUCTION DB:"
    echo "$new_migrations" | sed 's/^/  /'
    echo ""
  else
    log "No new migrations in this promotion."
  fi
fi

# ── Confirmation ──────────────────────────────────────────────────────────────

if [ "$1" != "--skip-confirm" ]; then
  echo -n "Type 'promote' to confirm: "
  read -r confirm
  if [ "$confirm" != "promote" ]; then
    die "Promotion cancelled."
  fi
fi

# ── Execute ───────────────────────────────────────────────────────────────────

log "Checking out $PROD_BRANCH..."
git checkout "$PROD_BRANCH" 2>/dev/null || git checkout -b "$PROD_BRANCH" "origin/$PROD_BRANCH" 2>/dev/null || git checkout -b "$PROD_BRANCH"

log "Merging $SOURCE_BRANCH → $PROD_BRANCH..."
git merge "$SOURCE_BRANCH" --no-edit -m "chore(promote): merge main → production $(date '+%Y-%m-%d %H:%M')"

log "Pushing to origin/$PROD_BRANCH..."
git push origin "$PROD_BRANCH"

log "Returning to $SOURCE_BRANCH..."
git checkout "$SOURCE_BRANCH"

echo ""
log "✓ Promotion complete."
log "  CI will now apply new migrations to PRODUCTION DB."
log "  To deploy frontend: use Catalyst admin UI → /admin/connections/vercel"
echo ""
warn "Next steps:"
echo "  1. Monitor GitHub Actions → apply-migrations.yml (migrate-prod job)"
echo "  2. Verify migrations succeeded in Supabase dashboard"
echo "  3. Deploy frontend via /admin/connections/vercel"
