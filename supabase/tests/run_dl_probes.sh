#!/usr/bin/env bash
# ============================================================================
# Module 7 — independent probe runner (DL-DEF-003 / DL-DEF-007 / DL-DEF-008)
# CAT-STRATA-DLDEF-20260718-001
#
# NO credential lives in this repository, this script, or any handback.
# Authorization comes ONLY from the environment at run time:
#
#   export STRATA_STAGING_DB_URL='<staging Postgres connection string>'
#
# J supplies that value privately (Supabase dashboard → catalyst-staging →
# Connect → Session pooler URI). Never commit it, never paste it into docs.
#
# GUARDS
#   • Refuses to run unless the URL names the staging ref cyijbdeuehohvhnsywig.
#   • Hard-refuses any URL containing the production ref lmqwtldpfacrrlvdnmld.
#   • Each probe additionally self-guards in SQL (migration-ledger markers)
#     and ends in RAISE EXCEPTION → every write rolls back (zero residue).
#
# SUCCESS = each probe prints 'PROBE_COMPLETE_ROLLBACK :: …' with its expected
# report values, and the final residue query returns 0.
# ============================================================================
set -euo pipefail

if [ -z "${STRATA_STAGING_DB_URL:-}" ]; then
  echo "ERROR: set STRATA_STAGING_DB_URL first (J provides it privately — never committed)." >&2
  exit 1
fi
case "$STRATA_STAGING_DB_URL" in
  *lmqwtldpfacrrlvdnmld*) echo "REFUSED: production project ref detected in URL." >&2; exit 1 ;;
  *cyijbdeuehohvhnsywig*) : ;;
  *) echo "REFUSED: URL does not name the staging ref cyijbdeuehohvhnsywig." >&2; exit 1 ;;
esac

DIR="$(cd "$(dirname "$0")" && pwd)"
STATUS=0
for f in dl_def_003_007_disposable_probe.sql dl_def_008_reversal_channel_probe.sql; do
  echo "== running $f"
  out="$(psql "$STRATA_STAGING_DB_URL" -f "$DIR/$f" 2>&1 || true)"
  printf '%s\n' "$out"
  if printf '%s' "$out" | grep -q 'PROBE_COMPLETE_ROLLBACK'; then
    echo "== $f: SUCCESS — deterministic report above; all writes rolled back."
  else
    echo "== $f: FAILURE — no PROBE_COMPLETE_ROLLBACK report." >&2
    STATUS=1
  fi
done

echo "== zero-residue verification"
psql "$STRATA_STAGING_DB_URL" -c \
  "SELECT count(*) AS zzqa_probe_residue FROM public.strata_upload_runs WHERE run_key IN ('ZZQA-J-LINEAGE-PROBE-A','ZZQA-J-LINEAGE-PROBE-B','ZZQA-J-LINEAGE-PROBE-C','ZZQA-DLDEF008');"
echo "   (expect zzqa_probe_residue = 0)"

exit "$STATUS"
