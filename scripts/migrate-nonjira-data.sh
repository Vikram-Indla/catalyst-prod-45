#!/bin/bash

set -euo pipefail

# Non-Jira data migration script
# Migrates user, admin, capacity, budget, and other Catalyst-specific data
# Excludes all Jira-related tables (ph_issues, ph_jira_*, etc.)
#
# Supports dry-run mode to preview what will be migrated
#
# Usage:
#   DRY_RUN=1 SOURCE_DB_URL="..." TARGET_DB_URL="..." ./scripts/migrate-nonjira-data.sh  (preview)
#   SOURCE_DB_URL="..." TARGET_DB_URL="..." ./scripts/migrate-nonjira-data.sh              (execute)

if [[ -z "${SOURCE_DB_URL:-}" ]] || [[ -z "${TARGET_DB_URL:-}" ]]; then
  echo "Error: SOURCE_DB_URL and TARGET_DB_URL environment variables are required"
  echo ""
  echo "Usage (dry-run to preview):"
  echo "  DRY_RUN=1 SOURCE_DB_URL='postgres://...' TARGET_DB_URL='postgres://...' ./scripts/migrate-nonjira-data.sh"
  echo ""
  echo "Usage (execute migration):"
  echo "  SOURCE_DB_URL='postgres://...' TARGET_DB_URL='postgres://...' ./scripts/migrate-nonjira-data.sh"
  exit 1
fi

DRY_RUN="${DRY_RUN:-0}"

echo "=========================================="
echo "Non-Jira Data Migration Script"
echo "=========================================="
echo "Source: ${SOURCE_DB_URL%@*}@***"
echo "Target: ${TARGET_DB_URL%@*}@***"
[[ "$DRY_RUN" == "1" ]] && echo "Mode: DRY-RUN (preview only, no changes)"
[[ "$DRY_RUN" == "0" ]] && echo "Mode: EXECUTE (migrating data)"
echo ""

# Tables to migrate — excludes all Jira-related tables
# Includes: profiles, user/role/permission, admin, capacity, budget, projects, workspace, etc.
TABLES=(
  # Core user/profile tables
  "profiles"
  "user_roles"
  "user_product_roles"
  "role_permissions"
  "user_permissions"
  "user_preferences"

  # Admin tables
  "admin_settings"
  "admin_audit_logs"
  "admin_feature_flags"
  "admin_users"

  # Organization/workspace
  "organization_settings"
  "organization_members"
  "workspace_settings"
  "workspace_members"
  "team_members"
  "team_roles"

  # Capacity / resource tables
  "resource_inventory"
  "capacity_allocations"
  "capacity_assignments"
  "capacity_departments"
  "r360_profiles"
  "r360_goals"
  "r360_feedback"
  "r360_feedback_responses"
  "license_allocations"
  "shared_allocations"
  "capacity_planning_scenarios"

  # Budget / planning tables (non-Jira)
  "budget_scenarios"
  "budget_scenario_details"
  "budget_templates"
  "spend_categories"
  "cost_drivers"
  "financial_forecasts"
  "budget_approvals"
  "budget_revisions"
  "budget_vs_actual"

  # Project management (non-Jira)
  "projects"
  "project_members"
  "project_settings"
  "project_roadmaps"
  "milestones"
  "releases"
  "deployment_pipelines"

  # Documents/content
  "documents"
  "document_versions"
  "document_comments"
  "wikis"
  "wiki_pages"

  # Notifications/preferences
  "notifications"
  "notification_preferences"
  "notification_templates"

  # Audit/compliance
  "audit_logs"
  "compliance_checklist"
  "compliance_evidence"
  "change_logs"

  # Other Catalyst-specific
  "custom_fields"
  "custom_field_values"
  "integrations"
  "integration_configs"
  "webhooks"
  "api_keys"
  "sessions"
)

MIGRATION_LOG="/tmp/nonjira_migration_$(date +%s).log"
TEMP_DUMP="/tmp/pg_dump_$(date +%s).sql"

echo "Migration mode: $([ "$DRY_RUN" = "1" ] && echo "DRY-RUN" || echo "EXECUTE")"
if [[ "$DRY_RUN" != "1" ]]; then
  echo "Migration log: $MIGRATION_LOG"
fi
echo ""

{
  echo "========== Non-Jira Migration Start: $(date) =========="
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "Mode: DRY-RUN (no changes will be made)"
  fi
  echo ""

  FOUND_COUNT=0
  MISSING_COUNT=0
  DUMPED_COUNT=0
  SKIPPED_COUNT=0
  FAILED_COUNT=0

  echo "Checking source database for available tables..."
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
      # Dry-run: just list the table
      row_count=$(psql "$SOURCE_DB_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null || echo "?")
      echo "  ✓ $table ($row_count rows)"
      ((SKIPPED_COUNT++))
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
  echo "Tables found on source: $FOUND_COUNT"
  echo "Tables not found:       $MISSING_COUNT"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo ""
    echo "DRY-RUN RESULTS:"
    echo "  Ready to migrate: $FOUND_COUNT tables"
    echo "  Not found:        $MISSING_COUNT tables (will be skipped)"
    echo ""
    echo "To execute migration, run without DRY_RUN=1:"
    echo "  SOURCE_DB_URL=... TARGET_DB_URL=... ./scripts/migrate-nonjira-data.sh"
  else
    echo "Dumped:  $DUMPED_COUNT tables"
    echo "Failed:  $FAILED_COUNT tables"
    echo ""

    if [[ $FAILED_COUNT -gt 0 ]]; then
      echo "⚠️  Some tables failed to migrate. Check errors above."
      exit 1
    else
      echo "✅ Non-Jira data migration complete."
    fi
  fi

  echo "========== Migration End: $(date) =========="
  echo ""
} | tee -a "$MIGRATION_LOG"

if [[ "$DRY_RUN" != "1" ]]; then
  echo "Full log: $MIGRATION_LOG"
fi
