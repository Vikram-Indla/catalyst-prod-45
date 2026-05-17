#!/bin/bash

set -euo pipefail

# Admin data migration script
# Migrates Lovable admin configuration and settings tables to new Supabase project
#
# Supports dry-run mode to preview what will be migrated
#
# Usage:
#   DRY_RUN=1 SOURCE_DB_URL="..." TARGET_DB_URL="..." ./scripts/migrate-admin-data.sh  (preview)
#   SOURCE_DB_URL="..." TARGET_DB_URL="..." ./scripts/migrate-admin-data.sh              (execute)

if [[ -z "${SOURCE_DB_URL:-}" ]] || [[ -z "${TARGET_DB_URL:-}" ]]; then
  echo "Error: SOURCE_DB_URL and TARGET_DB_URL environment variables are required"
  echo ""
  echo "Usage (dry-run to preview):"
  echo "  DRY_RUN=1 SOURCE_DB_URL='postgres://...' TARGET_DB_URL='postgres://...' ./scripts/migrate-admin-data.sh"
  echo ""
  echo "Usage (execute migration):"
  echo "  SOURCE_DB_URL='postgres://...' TARGET_DB_URL='postgres://...' ./scripts/migrate-admin-data.sh"
  exit 1
fi

DRY_RUN="${DRY_RUN:-0}"

echo "=========================================="
echo "Admin Data Migration Script"
echo "=========================================="
echo "Source: ${SOURCE_DB_URL%@*}@***"
echo "Target: ${TARGET_DB_URL%@*}@***"
[[ "$DRY_RUN" == "1" ]] && echo "Mode: DRY-RUN (preview only, no changes)"
[[ "$DRY_RUN" == "0" ]] && echo "Mode: EXECUTE (migrating data)"
echo ""

# Admin tables — configuration, settings, audit, feature flags
TABLES=(
  # Admin core settings
  "admin_settings"
  "admin_configuration"
  "admin_preferences"
  "admin_users"

  # Feature management
  "admin_feature_flags"
  "feature_toggles"
  "feature_releases"
  "feature_config"

  # Audit & compliance
  "admin_audit_logs"
  "admin_activity_logs"
  "change_logs"
  "audit_logs"
  "compliance_logs"

  # Access control
  "admin_roles"
  "admin_permissions"
  "admin_access_policies"
  "role_assignments"

  # System configuration
  "system_settings"
  "system_config"
  "environment_config"
  "deployment_config"

  # Integrations & webhooks
  "integrations"
  "integration_configs"
  "webhooks"
  "webhook_config"
  "api_keys"
  "api_config"

  # Notifications & alerts
  "notification_settings"
  "notification_templates"
  "alert_config"
  "alert_rules"

  # Database & backup
  "backup_config"
  "backup_schedules"
  "database_backups"
  "migration_logs"

  # Security
  "security_policies"
  "ip_whitelist"
  "rate_limits"
  "session_config"

  # Monitoring & reporting
  "admin_reports"
  "system_metrics"
  "performance_config"
  "monitoring_config"

  # Workflow & approval
  "admin_workflows"
  "admin_approvals"
  "workflow_config"
  "approval_rules"

  # User management
  "user_invitations"
  "user_invites"
  "admin_user_audit"
  "user_deactivations"
)

MIGRATION_LOG="/tmp/admin_migration_$(date +%s).log"
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
  SKIPPED_COUNT=0
  FAILED_COUNT=0

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
  echo "Admin tables found on source: $FOUND_COUNT"
  echo "Admin tables not found:       $MISSING_COUNT"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo ""
    echo "DRY-RUN RESULTS:"
    echo "  Ready to migrate: $FOUND_COUNT admin tables"
    echo "  Not found:        $MISSING_COUNT admin tables (will be skipped)"
    echo ""
    echo "To execute migration, run without DRY_RUN=1:"
    echo "  SOURCE_DB_URL=... TARGET_DB_URL=... ./scripts/migrate-admin-data.sh"
  else
    echo "Dumped:  $DUMPED_COUNT tables"
    echo "Failed:  $FAILED_COUNT tables"
    echo ""

    if [[ $FAILED_COUNT -gt 0 ]]; then
      echo "⚠️  Some tables failed to migrate. Check errors above."
      exit 1
    else
      echo "✅ Admin data migration complete."
    fi
  fi

  echo "========== Migration End: $(date) =========="
  echo ""
} | tee -a "$MIGRATION_LOG"

if [[ "$DRY_RUN" != "1" ]]; then
  echo "Full log: $MIGRATION_LOG"
fi
