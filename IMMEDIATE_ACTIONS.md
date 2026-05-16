# Immediate Actions — Next 30 Minutes

This document lists the critical steps to activate Phase 1 and Phase 2 before the 2-week Jira deprecation window closes.

---

## Action 1: Configure Jira Webhook (EXTERNAL — 10 min)

**What:** Register the Catalyst webhook receiver in Jira Cloud admin  
**Why:** Without this, Jira issues won't trigger For You page updates  
**Blocker:** If not done, Phase 1 is non-functional

### Steps

1. **Go to:** https://digital-transformation.atlassian.net/admin/webhooks
2. **Click:** "Create a webhook"
3. **Fill in:**
   - **Name:** `Catalyst Webhook Receiver`
   - **URL:** `https://lmqwtldpfacrrlvdnmld.supabase.co/functions/v1/jira-webhook-receiver`
   - **Events:** Check `issue:created` and `issue:updated`
   - **Filter (optional):** `project = BAU` (for testing scope)
   - **Active:** ✓ (enabled)

4. **Save**

5. **Test:**
   ```bash
   # Update any BAU issue in Jira
   # Then check Catalyst:
   
   # Option A: Via SQL
   psql 'postgres://postgres:PASSWORD@db.lmqwtldpfacrrlvdnmld.supabase.co:5432/postgres' \
     -c "SELECT COUNT(*) FROM user_recent_items;" 
   # Should show > 0 after issue update
   
   # Option B: Via UI
   # Go to http://localhost:8080/for-you
   # Should show the updated issue
   ```

---

## Action 2: Enable Cron Scheduler (MANUAL — 5 min)

**What:** Enable 5-minute polling on `jira-verify-scheduler`  
**Why:** Delta detection runs on schedule (not real-time)  
**Blocker:** If not done, Phase 2 won't detect sync issues

### Steps

1. **Go to:** https://app.supabase.com/project/lmqwtldpfacrrlvdnmld/functions
2. **Find:** `jira-verify-scheduler` in the list
3. **Click:** to open function details
4. **Scroll to:** "Cron schedule" section
5. **Enter:** `*/5 * * * *` (every 5 minutes)
6. **Save**

### Verification

After enabling, check logs:

```bash
# Logs should show verification running every 5 minutes
# Supabase Dashboard → Functions → jira-verify-scheduler → Logs

# Or check the audit table:
psql 'postgres://...' -c "SELECT COUNT(*) FROM jira_migration_audit;"
# Should increment every 5 minutes
```

---

## Action 3: Populate jira_identity_map (USER TEAM — 5 min)

**What:** Add all Jira assignees/reporters to identity mapping table  
**Why:** Without this, webhook can't route issues to correct Catalyst users  
**Blocker:** If incomplete, For You page stays empty for unmapped users

### Steps

1. **Get Jira user list:**
   ```bash
   # Query Jira REST API for all active users in BAU project
   curl -u EMAIL:API_TOKEN https://digital-transformation.atlassian.net/rest/api/3/users/search \
     -H "Accept: application/json"
   
   # OR go to Jira → People → find assignees in BAU project
   ```

2. **For each user, add mapping:**
   ```sql
   INSERT INTO jira_identity_map (jira_account_id, catalyst_user_id, display_name, email, is_active_in_jira, is_active_in_catalyst)
   VALUES (
     '5be3fef965364b69de240fe8',  -- from Jira API
     'b22582d5-28bb-47bf-9264-1fdf257e1a93',  -- user_id from Catalyst profiles table
     'vikram indla',
     'vikramataol@gmail.com',
     true,
     true
   );
   ```

3. **Verify coverage:**
   ```sql
   -- Check how many Jira assignees are mapped
   SELECT COUNT(DISTINCT assignee_account_id) as jira_users_in_backlog
   FROM ph_issues
   WHERE assignee_account_id IS NOT NULL;
   
   SELECT COUNT(*) as mapped_users FROM jira_identity_map;
   -- These should match (or mapped >= backlog)
   ```

---

## Action 4: Manual Test (5 min)

**What:** Trigger a real Jira update and watch the flow end-to-end  
**Why:** Confirms webhook delivery + For You page population + delta detection

### Steps

1. **Start dev server:**
   ```bash
   bun run dev
   # Catalyst should be at http://localhost:8080
   ```

2. **Open:** http://localhost:8080/for-you

3. **Make a Jira change:**
   - Go to a BAU issue (e.g., BAU-5836)
   - Change status (e.g., To Do → In Progress)
   - Or change assignee

4. **Watch for update in For You:**
   ```bash
   # Manually refresh page or check database:
   psql 'postgres://...' \
     -c "SELECT entity_key, summary, user_id, nav_path FROM user_recent_items ORDER BY created_at DESC LIMIT 5;"
   ```

5. **Verify audit log:**
   ```bash
   psql 'postgres://...' \
     -c "SELECT * FROM jira_migration_audit WHERE created_at > NOW() - INTERVAL '5 minutes';"
   # Should be empty (no deltas if sync is working)
   ```

---

## Quick Reference: Status After Each Action

| Action | Indicator | Expected Result |
|--------|-----------|-----------------|
| **Jira webhook** | `jira_webhook_events` table | Should have rows after Jira update |
| **Cron enabled** | Function logs | New log entry every 5 minutes |
| **Identity map** | `jira_identity_map` table | All assignees/reporters mapped |
| **Manual test** | For You page + audit table | Recent issue appears, audit is clean |

---

## If Blocked

### Webhook not delivering

```bash
# Check function logs for errors
supabase functions list --project-ref lmqwtldpfacrrlvdnmld

# Check Jira webhook status
# https://digital-transformation.atlassian.net/admin/webhooks
# Look for "Catalyst Webhook Receiver" → click for delivery log
```

### Cron not running

```bash
# Verify cron is enabled
# https://app.supabase.com/project/lmqwtldpfacrrlvdnmld/functions
# jira-verify-scheduler → check "Cron schedule" section

# If not showing, manually enable via dashboard
```

### Identity map incomplete

```bash
# Find unmapped assignees
SELECT DISTINCT assignee_account_id, assignee_name
FROM ph_issues
WHERE assignee_account_id NOT IN (
  SELECT jira_account_id FROM jira_identity_map
)
AND assignee_account_id IS NOT NULL;

# Then INSERT each one into jira_identity_map
```

---

## Timeline

- **Now:** Complete Actions 1–3
- **+30 min:** Verify with manual test (Action 4)
- **+2 hours:** Monitor For You page during day-to-day use
- **+2 weeks:** Review `jira_migration_audit` for any deltas, then finalize migration

---

## Success Criteria

✅ **Phase 1 live** when:
- Jira webhook fires AND `jira_webhook_events` gets audit rows
- For You page populates with recent issues
- User can click issue and navigate to detail view

✅ **Phase 2 running** when:
- Cron scheduler runs every 5 minutes (visible in logs)
- No deltas detected (sync is healthy)
- `jira_migration_audit` table remains empty or has only "divergence" entries (expected data lag)

---

## Related Documentation

- **Full Status:** `PHASE_1_2_DEPLOYMENT_STATUS.md`
- **Data Migration:** `scripts/DATA_MIGRATION_README.md`
- **Troubleshooting:** See "Troubleshooting" section in status doc
