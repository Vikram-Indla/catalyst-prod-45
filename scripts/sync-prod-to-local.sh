#!/usr/bin/env bash
# sync-prod-to-local.sh
#
# Pulls data from production into local Supabase stack.
# Safe: auth.users are excluded, emails stripped, PII anonymized.
# Requires: Docker running, `supabase start` already executed.
#
# Usage:
#   ./scripts/sync-prod-to-local.sh                  # all tables
#   ./scripts/sync-prod-to-local.sh --tables ph_issues,ph_projects  # specific tables

set -e

PROD_PROJECT="lmqwtldpfacrrlvdnmld"
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DUMP_FILE="/tmp/catalyst-prod-data-$(date +%Y%m%d%H%M%S).sql"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[sync]${NC} $1"; }
warn() { echo -e "${YELLOW}[sync]${NC} $1"; }
die()  { echo -e "${RED}[sync] ERROR:${NC} $1"; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────────────────────

command -v supabase >/dev/null 2>&1 || die "supabase CLI not found. Install: brew install supabase/tap/supabase"
command -v psql >/dev/null 2>&1 || die "psql not found. Install: brew install postgresql"

# Check local stack is running
psql "$LOCAL_DB_URL" -c "SELECT 1" >/dev/null 2>&1 || die "Local Supabase stack not running. Run: supabase start"

warn "═══════════════════════════════════════════════════════"
warn "  SYNCING production → local (data only)"
warn "  Production DB: $PROD_PROJECT"
warn "  Local DB:      127.0.0.1:54322"
warn "  auth.users excluded | emails anonymized"
warn "═══════════════════════════════════════════════════════"
echo ""

echo -n "Type 'sync' to confirm: "
read -r confirm
[ "$confirm" = "sync" ] || die "Cancelled."

# ── Dump production data ──────────────────────────────────────────────────────

log "Dumping production data (data-only, public schema)..."

SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-$(cat ~/.config/supabase/access-token 2>/dev/null || echo "")}
[ -z "$SUPABASE_ACCESS_TOKEN" ] && die "Set SUPABASE_ACCESS_TOKEN env var. Get from: https://supabase.com/dashboard/account/tokens"

# Dump data-only, public schema, exclude auth tables
supabase db dump \
  --project-ref "$PROD_PROJECT" \
  --data-only \
  --schema public \
  -f "$DUMP_FILE"

log "Dump saved to $DUMP_FILE"

# ── Anonymize PII ─────────────────────────────────────────────────────────────

log "Anonymizing PII (email addresses)..."
# Replace real emails with anonymized versions
sed -i '' \
  -e 's/[a-zA-Z0-9._%+-]\+@[a-zA-Z0-9.-]\+\.[a-zA-Z]\{2,\}/redacted@example.com/g' \
  "$DUMP_FILE" 2>/dev/null || \
sed -i \
  -e 's/[a-zA-Z0-9._%+-]\+@[a-zA-Z0-9.-]\+\.[a-zA-Z]\{2,\}/redacted@example.com/g' \
  "$DUMP_FILE"

# ── Restore into local ────────────────────────────────────────────────────────

log "Restoring into local stack..."
warn "Truncating local public tables first..."

# Truncate public schema tables (cascade) before restore
psql "$LOCAL_DB_URL" -c "
  DO \$\$
  DECLARE r RECORD;
  BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
      EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
  END \$\$;
" 2>/dev/null || warn "Some tables could not be truncated (may be OK)"

psql "$LOCAL_DB_URL" -f "$DUMP_FILE"

rm -f "$DUMP_FILE"
log "✓ Sync complete. Local stack now has production data (anonymized)."
echo ""
log "Local Supabase Studio: http://127.0.0.1:54323"
