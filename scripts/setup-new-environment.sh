#!/usr/bin/env bash
# setup-new-environment.sh
#
# Sets up a brand-new Supabase project as a Catalyst environment.
# Use for: staging, friend preview, QA environment.
#
# Prerequisites:
#   1. Create a new Supabase project at https://supabase.com/dashboard
#      (free: up to 2 projects per org — create a NEW org if needed)
#   2. Note down: Project Ref (ID), anon key, service role key
#   3. Set SUPABASE_ACCESS_TOKEN (from https://supabase.com/dashboard/account/tokens)
#
# Usage:
#   PROJECT_REF=<your-new-project-ref> ./scripts/setup-new-environment.sh
#
# After running: create a .env.local in your clone pointing to the new project.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[setup-env]${NC} $1"; }
warn() { echo -e "${YELLOW}[setup-env]${NC} $1"; }
die()  { echo -e "${RED}[setup-env] ERROR:${NC} $1"; exit 1; }

[ -z "$PROJECT_REF" ] && die "Set PROJECT_REF env var. Example: PROJECT_REF=abcdefghijklmno ./scripts/setup-new-environment.sh"
[ -z "$SUPABASE_ACCESS_TOKEN" ] && die "Set SUPABASE_ACCESS_TOKEN. Get from: https://supabase.com/dashboard/account/tokens"

warn "═══════════════════════════════════════════════════════"
warn "  Setting up new Catalyst environment"
warn "  Project: $PROJECT_REF"
warn "  This will apply ALL migrations to the new project."
warn "═══════════════════════════════════════════════════════"
echo ""
echo -n "Type 'setup' to confirm: "
read -r confirm
[ "$confirm" = "setup" ] || die "Cancelled."

log "Linking to project $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

log "Pushing all migrations..."
supabase db push --linked

log "✓ Environment ready: https://$PROJECT_REF.supabase.co"
echo ""
log "Next steps:"
echo "  1. Get anon key from Supabase dashboard → Project Settings → API"
echo "  2. Create .env.local in your repo clone:"
echo ""
echo "     VITE_SUPABASE_URL=https://$PROJECT_REF.supabase.co"
echo "     VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-dashboard>"
echo ""
echo "  3. Set edge function secrets:"
echo "     supabase secrets set --project-ref $PROJECT_REF \\"
echo "       ANTHROPIC_API_KEY=<key> \\"
echo "       GEMINI_API_KEY=<key> \\"
echo "       JIRA_BASE_URL=https://digital-transformation.atlassian.net \\"
echo "       JIRA_EMAIL=<email> \\"
echo "       JIRA_API_TOKEN=<token>"
echo ""
echo "  4. Deploy edge functions:"
echo "     supabase functions deploy --project-ref $PROJECT_REF"
