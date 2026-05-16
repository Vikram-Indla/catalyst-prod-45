#!/bin/bash

set -euo pipefail

# Data migration script for Supabase projects
# Dumps data-only from source DB and loads into target DB
# Schema must already exist on target (apply full_schema.sql first)
#
# Usage:
#   SOURCE_DB_URL="postgres://postgres:SOURCE_PASS@source.supabase.co:5432/postgres" \
#   TARGET_DB_URL="postgres://postgres:TARGET_PASS@target.supabase.co:5432/postgres" \
#   ./scripts/migrate-data-to-external.sh

if [[ -z "${SOURCE_DB_URL:-}" ]] || [[ -z "${TARGET_DB_URL:-}" ]]; then
  echo "Error: SOURCE_DB_URL and TARGET_DB_URL environment variables are required"
  echo ""
  echo "Usage:"
  echo "  SOURCE_DB_URL='postgres://...' TARGET_DB_URL='postgres://...' ./scripts/migrate-data-to-external.sh"
  exit 1
fi

echo "=========================================="
echo "Data Migration Script"
echo "=========================================="
echo "Source: ${SOURCE_DB_URL%@*}@***"
echo "Target: ${TARGET_DB_URL%@*}@***"
echo ""

# Tables to migrate (in dependency order, FK-aware)
# Includes: profiles, user/role/permission, admin, capacity, budget
TABLES=(
  # Core user/profile tables
  "profiles"
  "user_roles"
  "user_product_roles"
  "role_permissions"
  "user_permissions"

  # Admin tables
  "admin_settings"
  "admin_audit_logs"
  "admin_feature_flags"

  # Capacity / resource tables
  "resource_inventory"
  "capacity_allocations"
  "capacity_assignments"
  "r360_profiles"
  "r360_goals"
  "r360_feedback"
  "capacity_departments"
  "license_allocations"
  "shared_allocations"

  # Budget / planning tables
  "budget_scenarios"
  "budget_scenario_details"
  "ph_initiative_budget_items"
  "epic_spend"
  "spend_forecasts"
  "spend_per_quarter"
  "spend_per_project"
  "spend_per_initiative"

  # Additional user/org tables
  "user_preferences"
  "organization_settings"
  "team_members"
  "team_roles"
)

MIGRATION_LOG="/tmp/data_migration_$(date +%s).log"
TEMP_DUMP="/tmp/pg_dump_$(date +%s).sql"

echo "Migration log: $MIGRATION_LOG"
echo ""

{
  echo "========== Migration Start: $(date) =========="
  echo ""

  DUMPED_COUNT=0
  SKIPPED_COUNT=0
  FAILED_COUNT=0

  for table in "${TABLES[@]}"; do
    # Check if table exists on source (silent failure = skip)
    table_exists=$(psql "$SOURCE_DB_URL" -t -c \
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='$table' AND table_schema='public');" \
      2>/dev/null || echo "f")

    if [[ "$table_exists" != "t" ]]; then
      echo "SKIP  $table (not found on source)"
      ((SKIPPED_COUNT++))
      continue
    fi

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
      else
        echo "FAIL  $table (load failed)"
        ((FAILED_COUNT++))
      fi
    else
      echo "FAIL  $table (dump failed)"
      ((FAILED_COUNT++))
    fi
  done

  rm -f "$TEMP_DUMP"

  echo ""
  echo "========== Migration Summary =========="
  echo "Dumped:  $DUMPED_COUNT tables"
  echo "Skipped: $SKIPPED_COUNT tables (not on source)"
  echo "Failed:  $FAILED_COUNT tables"
  echo "========== Migration End: $(date) =========="
  echo ""

  if [[ $FAILED_COUNT -gt 0 ]]; then
    echo "⚠️  Some tables failed to migrate. Check errors above."
    exit 1
  else
    echo "✅ Data migration complete."
  fi
} | tee -a "$MIGRATION_LOG"

echo ""
echo "NOTE: auth.users is not migrated (managed by Supabase)"
echo "      After migration, re-invite users on target project."
echo "      If auth UUIDs differ, profiles.user_id may need remapping."
echo ""
echo "Full log: $MIGRATION_LOG"
