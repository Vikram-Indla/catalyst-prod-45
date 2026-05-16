#!/bin/bash

# Targeted admin data migration to lmqwtldpfacrrlvdnmld project
# Migrates all admin configuration, workflows, statuses, and Jira user mapping
# from Lovable source to new Catalyst Supabase project
#
# Prerequisite: Target schema must exist (run sync-schema-to-external.sh first)
# Post-migration: Re-invite users with same emails, then run remap-auth-uuids.sql
#
# Usage:
#   DRY_RUN=1 SOURCE_DB_URL="..." TARGET_DB_URL="..." ./scripts/migrate-admin-to-lmqwtldpfacrrlvdnmld.sh  (preview)
#   SOURCE_DB_URL="..." TARGET_DB_URL="..." ./scripts/migrate-admin-to-lmqwtldpfacrrlvdnmld.sh              (execute)

set -euo pipefail

if [[ -z "${SOURCE_DB_URL:-}" ]] || [[ -z "${TARGET_DB_URL:-}" ]]; then
  echo "Error: SOURCE_DB_URL and TARGET_DB_URL environment variables are required"
  echo ""
  echo "Usage (dry-run to preview):"
  echo "  DRY_RUN=1 SOURCE_DB_URL='postgres://...' TARGET_DB_URL='postgres://...' ./scripts/migrate-admin-to-lmqwtldpfacrrlvdnmld.sh"
  echo ""
  echo "Usage (execute migration):"
  echo "  SOURCE_DB_URL='postgres://...' TARGET_DB_URL='postgres://...' ./scripts/migrate-admin-to-lmqwtldpfacrrlvdnmld.sh"
  exit 1
fi

DRY_RUN="${DRY_RUN:-0}"

echo "=========================================="
echo "Catalyst Admin Data Migration"
echo "Target: lmqwtldpfacrrlvdnmld (new project)"
echo "=========================================="
echo "Source: ${SOURCE_DB_URL%@*}@***"
echo "Target: ${TARGET_DB_URL%@*}@***"
[[ "$DRY_RUN" == "1" ]] && echo "Mode: DRY-RUN (preview only, no changes)"
[[ "$DRY_RUN" == "0" ]] && echo "Mode: EXECUTE (migrating data)"
echo ""

# Admin tables with confirmed data from Lovable probe
TABLES=(
  # Admin navigation and modules
  "admin_nav_modules"
  
  # Admin roles and permissions
  "admin_role_module_permissions"
  "admin_permission_audit"
  "product_roles"
  "product_role_permissions"
  "role_catalog"
  
  # User management
  "profiles"
  "user_roles"
  "user_product_roles"
  
  # Programs and capacity
  "programs"
  "departments"
  "capacity_departments"
  "resource_assignments"
  "resource_inventory"
  
  # Jira integration
  "ph_user_mapping"
  "jira_user_project_perms"
  "ph_jira_connection"
  
  # Status workflows
  "epic_statuses"
  "feature_statuses"
  "theme_statuses"
  
  # Feature flags
  "feature_flags"
)

MIGRATION_LOG="/tmp/admin_migration_lmqwtldpfacrrlvdnmld_$(date +%s).log"
TEMP_DUMP="/tmp/pg_dump_$(date +%s).sql"

echo "Migration mode: $([ "$DRY_RUN" = "1" ] && echo "DRY-RUN" || echo "EXECUTE")"
if [[ "$DRY_RUN" != "1" ]]; then
  echo "Migration log: $MIGRATION_LOG"
fi
echo ""

{
  echo "========== Admin Migration Start: $(date) =========="
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "Mode: DRY-RUN (no changes will be made)"
  fi
  echo ""

  FOUND_COUNT=0
  MISSING_COUNT=0
  DUMPED_COUNT=0
  FAILED_COUNT=0
  TOTAL_ROWS=0

  echo "Checking source database for admin tables..."
  echo ""

  for table in "${TABLES[@]}"; do
    # Check if table exists on source
    table_exists=$(psql "$SOURCE_DB_URL" -t -c \
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='$table' AND table_schema='public');" \
      2>/dev/null || echo "f")

    if [[ "$table_exists" != "t" ]]; then
      ((MISSING_COUNT++))
      continue
    fi

    ((FOUND_COUNT++))

    if [[ "$DRY_RUN" == "1" ]]; then
      # Dry-run: just list the table with row count
      row_count=$(psql "$SOURCE_DB_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null || echo "?")
      echo "  ✓ $table ($row_count rows)"
      ((TOTAL_ROWS+=row_count))
      continue
    fi

    # Real migration
    echo "DUMP  $table..."

    # Dump data from source (no schema, no triggers, row-by-row inserts)
    if pg_dump "$SOURCE_DB_URL" \
      --data-only \
      --table="public.\"$table\"" \
      --disable-triggers \
      --column-inserts \
      --no-privileges \
      --no-owner \
      > "$TEMP_DUMP" 2>/dev/null; then

      # Count rows in dump
      row_count=$(grep -c "^INSERT INTO" "$TEMP_DUMP" || echo "0")

      # Load into target (suppress progress, show errors)
      if psql "$TARGET_DB_URL" --quiet < "$TEMP_DUMP" 2>/dev/null; then
        echo "LOAD  $table ($row_count rows)"
        ((DUMPED_COUNT++))
        ((TOTAL_ROWS+=row_count))
      else
        echo "FAIL  $table (load failed)"
        ((FAILED_COUNT++))
      fi
    else
      echo "FAIL  $table (dump failed)"
      ((FAILED_COUNT++))
    fi
  done

  if [[ "$DRY_RUN" != "1" ]]; then
    rm -f "$TEMP_DUMP"
  fi

  echo ""
  echo "========== Migration Summary =========="
  echo "Admin tables found on source: $FOUND_COUNT"
  echo "Admin tables not found:       $MISSING_COUNT"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo ""
    echo "DRY-RUN RESULTS:"
    echo "  Tables ready to migrate:  $FOUND_COUNT"
    echo "  Total rows to migrate:    $TOTAL_ROWS"
    echo "  Tables not found:         $MISSING_COUNT (will be skipped)"
    echo ""
    echo "⚠️  NEXT STEPS:"
    echo "  1. Verify row counts match expected (see above)"
    echo "  2. Run actual migration:"
    echo "     SOURCE_DB_URL=... TARGET_DB_URL=... ./scripts/migrate-admin-to-lmqwtldpfacrrlvdnmld.sh"
    echo "  3. After migration, run auth remapping:"
    echo "     psql \$TARGET_DB_URL -v source_csv=/tmp/source_users.csv -f scripts/remap-auth-uuids.sql"
  else
    echo "Dumped:  $DUMPED_COUNT tables"
    echo "Failed:  $FAILED_COUNT tables"
    echo "Total rows migrated: $TOTAL_ROWS"
    echo ""

    if [[ $FAILED_COUNT -gt 0 ]]; then
      echo "⚠️  Some tables failed to migrate. Check errors above."
      exit 1
    else
      echo "✅ Admin data migration complete."
      echo ""
      echo "NEXT STEPS:"
      echo "  1. Re-invite users on target project (same emails as source)"
      echo "  2. Export source auth.users for UUID remapping:"
      echo "     psql \$SOURCE_DB_URL -c \"\\COPY (SELECT email, id FROM auth.users WHERE email IS NOT NULL) TO '/tmp/source_users.csv' WITH CSV HEADER\""
      echo "  3. Run auth UUID remapping on target:"
      echo "     psql \$TARGET_DB_URL -v source_csv=/tmp/source_users.csv -f scripts/remap-auth-uuids.sql"
    fi
  fi

  echo "========== Migration End: $(date) =========="
  echo ""
} | tee -a "$MIGRATION_LOG"

if [[ "$DRY_RUN" != "1" ]]; then
  echo "Full log: $MIGRATION_LOG"
fi
