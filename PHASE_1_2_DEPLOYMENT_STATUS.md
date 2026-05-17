# Phase 1 & 2 Deployment Status

**Date:** 2026-05-16  
**Scope:** Jira webhook integration (Phase 1) + Verification infrastructure (Phase 2)  
**Git:** Commit `2cc363ad5` (data migration scripts), `e16154f95` (webhook v7)

---

## Phase 1 — Real-time Webhook Sync

### Deployed Functions

| Function | Version | Status | Purpose |
|----------|---------|--------|---------|
| `jira-webhook-receiver` | v7 | ✅ ACTIVE | Receives Jira `issue.updated` events, extracts meaningful changes (status/assignee/summary/description/priority), populates `user_recent_items` for For You page |
| `jira-sync-checkpoints` | N/A | ✅ TABLE | Tracks last webhook checkpoint for verification polling |
| `jira_webhook_events` | N/A | ✅ TABLE | Audit log of all webhook payloads received |

### Database Migrations Applied

```
20260516_webhook_infrastructure.sql
  - jira_webhook_events (id, payload, event_type, issue_key, created_at)
  - sync_events (id, event_type, source, status, created_at)
  - sync_cooldowns (entity_key, cooldown_until_at)
  - jira_sync_checkpoints (id, last_synced_at, next_check_at)
```

### User Identity Mapping

**jira_identity_map** table populated:
- Sample mapping: vikramataol@gmail.com (Jira: 5be3fef965364b69de240fe8) → Catalyst user_id (b22582d5-28bb-47bf-9264-1fdf257e1a93)
- For You page will use this to route recent issues to correct user

### Blocker: Jira Webhook Configuration (EXTERNAL)

**Status:** ⏳ Awaiting external setup

Jira webhook is NOT automatically configured. Must be set up manually in Jira Cloud admin:

**How to configure:**

1. Go to: Jira Cloud Settings → Webhooks
2. Create new webhook:
   - **Name:** `Catalyst Webhook Receiver`
   - **URL:** `https://lmqwtldpfacrrlvdnmld.supabase.co/functions/v1/jira-webhook-receiver`
   - **Events:** `issue:created`, `issue:updated`
   - **Filter:** (optional) `project = BAU` for testing scope
   - **Active:** ✓ enabled

3. Test by:
   - Updating any BAU issue in Jira
   - Checking Catalyst For You page (`user_recent_items` table should populate)
   - Verifying `jira_webhook_events` audit log

---

## Phase 2 — Verification Polling (Delta Detection)

### Deployed Functions

| Function | Version | Status | Purpose |
|----------|---------|--------|---------|
| `jira-verify-delta` | v1 | ✅ ACTIVE | Queries Jira REST API since last checkpoint, verifies each issue exists in Catalyst, detects missing mappings, logs audit records |
| `jira-verify-scheduler` | v1 | ✅ ACTIVE | Wrapper that calls jira-verify-delta, formats response, returns delta counts |

### Database Tables

```
jira_migration_audit (id, audit_type, entity_type, entity_key, change_summary, delta_detected, status, created_at)
  - audit_type: missing_in_catalyst, missing_user_mapping, divergence_summary
  - delta_detected: true if sync issue found
  - status: pending, resolved, reviewed
```

### Test Results

```bash
curl -X POST https://lmqwtldpfacrrlvdnmld.supabase.co/functions/v1/jira-verify-scheduler

Response:
{
  "ok": true,
  "deltaCount": 0,
  "timestamp": "2026-05-16T02:27:01.322Z",
  "invocation": "scheduled"
}

✅ PASS: Function invocation successful, no pending deltas (expected before webhook events arrive)
```

### Blocker: Cron Scheduling (MANUAL)

**Status:** ⏳ Requires Supabase dashboard action

The `jira-verify-scheduler` must be configured to run every 5 minutes. The Supabase CLI doesn't support the `--cron` flag, so enable manually:

**How to enable cron:**

1. Go to: Supabase Dashboard → Project `lmqwtldpfacrrlvdnmld`
2. Functions → `jira-verify-scheduler`
3. Click "Edit Function" → Cron schedule section
4. Enter: `*/5 * * * *` (every 5 minutes)
5. Save

Alternatively, if a personal access token is available:

```bash
SUPABASE_ACCESS_TOKEN="YOUR_TOKEN" bash /tmp/enable_cron.sh
```

**Verification:** After enabling, the function should appear in logs every 5 minutes.

---

## Data Migration Infrastructure (Phase 0)

### Scripts Deployed

| Script | Purpose | Status |
|--------|---------|--------|
| `migrate-data-to-external.sh` | pg_dump source → psql target for 125+ tables | ✅ READY |
| `remap-auth-uuids.sql` | Remap user_id foreign keys if target auth UUIDs differ | ✅ READY |
| `DATA_MIGRATION_README.md` | Complete workflow + troubleshooting guide | ✅ READY |

### Tables Covered

- **Profiles/Auth:** profiles, user_roles, user_product_roles, role_permissions, user_permissions
- **Admin:** admin_settings, admin_audit_logs, admin_feature_flags
- **Capacity:** resource_inventory, capacity_allocations, r360_profiles, capacity_departments, etc.
- **Budget:** budget_scenarios, epic_spend, spend_forecasts, etc.

### Migration Flow

```
1. Apply schema:
   psql $TARGET_DB_URL < full_schema.sql

2. Migrate data:
   SOURCE_DB_URL="..." TARGET_DB_URL="..." ./scripts/migrate-data-to-external.sh

3. Re-invite users on target (auth.users not migrated)

4. Remap auth UUIDs (if different):
   psql $TARGET_DB_URL < scripts/remap-auth-uuids.sql
```

---

## Deployment Checklist

### Pre-Launch (Before webhook events)

- [ ] **Webhook configuration** — Jira webhook registered and active (external)
- [ ] **Cron scheduling** — jira-verify-scheduler cron enabled (manual dashboard setup)
- [ ] **Identity mapping** — jira_identity_map populated for all team members
- [ ] **For You page** — Verified UI renders without errors on localhost:8080

### Launch (After webhook events arrive)

- [ ] **Webhook test** — Trigger Jira issue update, confirm `user_recent_items` populates
- [ ] **For You page** — Confirm recent issues appear on /for-you
- [ ] **Verification loop** — Monitor `jira_migration_audit` for deltas detected during 2-week window
- [ ] **Delta resolution** — If deltas found, create missing mappings / sync missing issues

### Post-Launch (2-week migration window)

- [ ] **Daily delta review** — Check `jira_migration_audit` for pending items
- [ ] **User mapping audit** — Ensure all assignees/reporters have entries in `jira_identity_map`
- [ ] **Data validation** — Spot-check Catalyst issue counts vs Jira JQL equivalents
- [ ] **Communication** — Inform users that For You page is now live and populated from Jira

---

## Troubleshooting

### Webhook Not Delivering Events

**Symptom:** `jira_webhook_events` table is empty after Jira update

**Causes:**
1. Webhook URL not registered in Jira admin
2. Webhook marked as inactive
3. Network firewall blocking outbound to Supabase

**Fix:**
- Verify webhook in Jira admin → Webhooks → find "Catalyst Webhook Receiver"
- Check Supabase logs: Functions → jira-webhook-receiver → Logs
- Test endpoint manually: `curl -X POST https://lmqwtldpfacrrlvdnmld.supabase.co/functions/v1/jira-webhook-receiver`

### For You Page Empty

**Symptom:** `user_recent_items` table has 0 rows after webhook fires

**Causes:**
1. Webhook received but `getJiraToCatalystUserId()` returned null (no mapping)
2. User not in `jira_identity_map` table
3. Webhook didn't call `handleIssueUpdateForForYou()`

**Fix:**
- Check `jira_identity_map`: `SELECT * FROM jira_identity_map;`
- Add missing users: `INSERT INTO jira_identity_map (jira_account_id, catalyst_user_id, display_name, email, is_active_in_jira, is_active_in_catalyst) VALUES (...)`
- Verify webhook code: `jira-webhook-receiver` v7 contains `handleIssueUpdateForForYou()` call

### Verification Loop Not Running

**Symptom:** `jira_migration_audit` table never gets new records

**Causes:**
1. Cron not enabled on jira-verify-scheduler
2. Function error in jira-verify-delta (Jira API connectivity)
3. Checkpoint not advancing

**Fix:**
- Enable cron: Supabase Dashboard → Functions → jira-verify-scheduler → enable `*/5 * * * *`
- Check logs: Functions → jira-verify-delta → Logs
- Verify Jira credentials: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` set in Supabase secrets

---

## Next Steps

1. **Configure Jira webhook** (external action required)
2. **Enable cron on jira-verify-scheduler** (Supabase dashboard)
3. **Trigger test Jira update** and confirm For You page populates
4. **Monitor delta detection** during 2-week window
5. **After 2 weeks:** Confirm full sync, switch to final data state, decommission Phase 1 webhook

---

## Links

- **Supabase Functions:** https://app.supabase.com/project/lmqwtldpfacrrlvdnmld/functions
- **Jira Webhook Admin:** https://digital-transformation.atlassian.net/admin/webhooks
- **Database:** `lmqwtldpfacrrlvdnmld`
- **Catalyst App:** http://localhost:8080

---

## Related Commits

- `e16154f95` — Deploy jira-webhook-receiver v7 with For You handlers
- `2cc363ad5` — Add data migration scripts (migrate-data-to-external.sh, remap-auth-uuids.sql)
