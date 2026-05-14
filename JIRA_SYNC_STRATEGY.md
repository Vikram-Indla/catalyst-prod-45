# JIRA Sync Strategy: Mobile & Web Database Parity

**Date:** 2026-05-14  
**Investigation:** Database synchronization of JIRA pull between CatyMobile and Catalyst 45  
**Status:** INVESTIGATION COMPLETE - ARCHITECTURE REVIEWED

---

## Executive Summary

**Both CatyMobile and Catalyst 45 share the same Supabase backend database.** Parity is **automatically achieved** because both platforms query identical tables (`ph_*`). No separate sync mechanism is needed — the data layer itself enforces synchronization.

**Current State:** JIRA sync is frozen (disabled) across both platforms. All work item data is preserved in Catalyst-native tables. Edge functions remain in place for future re-enablement.

---

## Architecture Overview

### Shared Data Layer

```
┌─────────────────────────────────────────────────────────┐
│           Supabase Backend (Shared)                     │
│                                                         │
│  Database: Single PostgreSQL instance                  │
│  Storage:  Single Supabase storage bucket              │
│  Auth:     Single Supabase auth provider              │
└─────────────────────────────────────────────────────────┘
         ▲                                      ▲
         │                                      │
    ┌────┴──────────────────────────┬───────────┴────┐
    │                               │                │
┌───▼──────────┐          ┌────────▼──────┐  ┌──────▼──────┐
│ Catalyst 45  │          │  CatyMobile   │  │ Other Apps  │
│  (Web)       │          │   (Mobile)    │  │             │
└──────────────┘          └───────────────┘  └─────────────┘
```

### Key Data Tables (JIRA Domain)

**Primary issue tables:**
- `ph_issues` — Work items (Epic, Story, Task, Bug, etc.)
- `ph_projects` — Project metadata
- `ph_jira_connection` — Jira credentials & sync config
- `jira_integration_config` — Sync freeze toggle + status
- `ph_sync_log` — Sync history & diagnostics
- `jira_identity_map` — Jira user ↔ Catalyst profile mapping

**Supporting tables:**
- `ph_attachments` — File metadata (Jira attachments)
- `ph_watchers` — Issue watchers list
- `ph_issue_links` — Relationship tracking (parent, related, blocks)
- `ph_work_item_labels`, `ph_work_item_components` — Multi-value fields
- `ph_activity_log` — Issue history & comments

---

## Edge Functions: JIRA Pull Strategy

### 1. **catalyst-full-sync** (Full Data Sync)

**Entry Point:** `supabase/functions/catalyst-full-sync/index.ts`

**Purpose:** One-shot pull of ALL issues created in a given year (default: 2026).

**Flow:**
```
POST /functions/v1/catalyst-full-sync
├─ Read Jira credentials from ph_jira_connection
├─ Discover projects (from wh_config or Jira REST API)
├─ For each project:
│  ├─ JQL: project = "KEY" AND created >= "2026-01-01"
│  ├─ POST /rest/api/3/search/jql (paginated, 100/page)
│  ├─ Transform & upsert to ph_issues (onConflict: 'issue_key')
│  └─ Download attachments (non-video) to Supabase storage
├─ Hydrate ADF media nodes with public storage URLs
└─ Log sync result to ph_sync_log
```

**Field Mapping (Jira → Catalyst):**
```typescript
{
  issue_key: string,
  project_key: string,
  project_name: string,
  issue_type: string,
  summary: string,
  status: string,
  status_category: 'To Do' | 'In Progress' | 'Done',
  assignee_account_id: string | null,
  assignee_display_name: string | null,
  reporter_account_id: string | null,
  reporter_display_name: string | null,
  parent_key: string | null,
  parent_summary: string | null,
  hierarchy_level: 1 | 2 | 3,
  fix_versions: Array<{ id, name, releaseDate }>,
  due_date: string | null,
  labels: string[],
  components: string[],
  priority: string,
  resolution: string | null,
  jira_created_at: ISO8601,
  jira_updated_at: ISO8601,
  synced_at: ISO8601,
  type_icon_url: string | null,
  description_adf: JSON | null,
  description_text: string | null,
}
```

**Guards:**
- **2026+ Only:** Filters out pre-2026 issues before upsert
- **Batch Size:** 200 rows per upsert call (prevents timeout)
- **On Conflict:** Uses `issue_key` as PK; UPDATE if exists, INSERT if new
- **Pagination:** POST /search/jql with cursor-based `nextPageToken`

---

### 2. **jira-bau-reload** (Delta Sync)

**Entry Point:** `supabase/functions/jira-bau-reload/index.ts`

**Purpose:** Incremental pull for BAU project — only updated issues since last sync.

**Flow:**
```
POST /functions/v1/jira-bau-reload
├─ Find delta start: MAX(jira_updated_at) from ph_issues where project_key='BAU'
├─ JQL: project = BAU AND updated > "2026-MM-DD HH:mm"
├─ For each returned issue:
│  ├─ Fetch full issue data (attachments, ADF description, changelog)
│  ├─ Download non-video attachments to storage
│  ├─ Parse ADF media nodes, replace with public storage URLs
│  ├─ Upsert to ph_issues
│  └─ Log attachment metrics (uploaded, skipped, errors)
└─ Record run to jira_bau_reload_runs table
```

**Attachment Handling:**
- Skip video files (`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, etc.)
- Upload images & docs to `jira-attachments/{PROJECT}/{ISSUE}/{FILE_ID}_{SAFE_NAME}`
- Hydrate ADF media nodes: replace `media.attrs.id` with public storage URL
- Set `media.attrs.type = 'external'` to signal external image

**Run Tracking:**
```sql
CREATE TABLE jira_bau_reload_runs (
  id uuid PRIMARY KEY,
  status: 'running' | 'success' | 'error',
  since_timestamp: ISO8601,
  processed: integer,
  upserted: integer,
  videos_skipped: integer,
  attachments_uploaded: integer,
  errors: jsonb[]
);
```

---

### 3. **wh-jira-webhook** (Real-Time Events)

**Entry Point:** `supabase/functions/wh-jira-webhook/index.ts`

**Purpose:** Webhook receiver for real-time Jira events.

**Events Handled:**
- `jira:issue_created` → INSERT into ph_issues
- `jira:issue_updated` → UPDATE ph_issues
- `jira:issue_deleted` → Mark soft-delete (jira_removed_at)

**Signature Verification:**
```typescript
HMAC-SHA256(payload, secret) == x-hub-signature-256 header
```

**Flow:**
```
POST /functions/v1/wh-jira-webhook
├─ Verify HMAC signature (constant-time comparison)
├─ Parse event JSON
├─ Extract issue_key, event_type
├─ Transform Jira fields → Catalyst fields
├─ Map Jira priority name → Catalyst priority (critical/high/medium/low)
├─ Upsert to ph_issues or soft-delete (jira_removed_at = now())
└─ Log to jira_sync_logs
```

**Priority Mapping:**
```typescript
'Highest'/'Blocker'  → 'critical'
'High'/'Major'       → 'high'
'Medium'             → 'medium'
'Low'/'Minor'        → 'low'
'Lowest'/'Trivial'   → 'low'
```

---

## Sync State Machine

### Configuration Table: `jira_integration_config`

```sql
CREATE TABLE jira_integration_config (
  id uuid PRIMARY KEY,
  sync_enabled: boolean DEFAULT false,
  frozen_at: timestamptz,
  freeze_triggered_by: uuid REFERENCES profiles(id),
  freeze_note: text,
  last_sync_at: timestamptz,
  data_cutoff_year: integer DEFAULT 2026,
  preserved_work_items: integer,
  preserved_projects: integer,
  preserved_users: integer,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
);
```

### Sync Control Functions

**1. `is_jira_sync_enabled()` — Query Function**
```sql
SELECT COALESCE(
  (SELECT sync_enabled FROM jira_integration_config LIMIT 1), 
  false
);
```
Used by edge functions and queries to conditionally execute sync logic.

**2. `disable_jira_sync(triggered_by UUID, note TEXT) → JSONB`**
```
Updates jira_integration_config:
  sync_enabled = false
  frozen_at = now()
Disables pg_cron jobs:
  - process-sync-queue
  - retry-failed-sync
  - clean-old-sync-events
Returns: { status: 'disabled', message: '...', preserved_work_items, etc. }
```

**3. `enable_jira_sync(triggered_by UUID) → JSONB`**
```
Updates jira_integration_config:
  sync_enabled = true
  frozen_at = NULL
Re-schedules pg_cron jobs:
  - process-sync-queue (every minute)
  - retry-failed-sync (every 5 minutes)
Returns: { status: 'enabled', message: 'Run full sync to pull latest data' }
```

**4. `get_jira_sync_status() → JSONB` — Admin RPC**
```
Returns current state for admin panel polling.
```

---

## Row-Level Security (RLS) Freeze Gate

When `sync_enabled = false`, all JIRA bridge tables return ZERO rows to authenticated users:

```sql
CREATE POLICY jira_freeze_gate ON <table_name>
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_jira_sync_enabled());
```

**Tables Frozen:**
- `jira_identity_map`
- `jira_connections`
- `jira_auth_credentials`
- `jira_field_mappings`
- `jira_project_mappings`
- `jira_board_mappings`
- `wh_jira_connection`
- `wh_user_mapping`
- `ra_jira_connections`
- `ph_jira_connection`
- `ph_jira_sync_log`

**Service-role bypass:** Edge functions use `SUPABASE_SERVICE_ROLE_KEY` and bypass RLS entirely.

---

## Mobile & Web Parity Mechanism

### Why Sync Happens Automatically

```
┌─────────────────────────────────────────────────┐
│     Supabase Realtime (Optional)                │
│  Subscriptions to table changes broadcast      │
│  to all connected clients in real-time         │
└─────────────────────────────────────────────────┘
           ▲                            ▲
           │                            │
    ┌──────┴─────────┐        ┌────────┴──────────┐
    │ Catalyst 45    │        │  CatyMobile       │
    │ Web Browser    │        │  Mobile App       │
    │ Subscriber     │        │  Subscriber       │
    │ (optional)     │        │  (optional)       │
    └────────────────┘        └───────────────────┘
           │                            │
           └────────┬──────────────────┘
                    │
            ┌───────▼────────┐
            │  ph_issues     │
            │  ph_projects   │
            │  ph_watchers   │
            │  etc.          │
            └────────────────┘
```

### Query Parity

Both apps query the exact same tables:

**Catalyst 45 (Web):**
```typescript
const { data: issues } = await supabase
  .from('ph_issues')
  .select('*')
  .eq('project_key', 'BAU');
```

**CatyMobile (App):**
```typescript
const { data: issues } = await supabase
  .from('ph_issues')
  .select('*')
  .eq('project_key', 'BAU');
```

**Result:** Identical data, same timestamp, automatic parity.

---

## Data Flow Diagram

```
Jira Instance
    │
    │ REST API 3
    │ (Basic Auth: email:token)
    │
    ▼
┌─────────────────────────────────────────┐
│    Edge Function (catalyst-full-sync,   │
│    jira-bau-reload, or webhook)         │
│                                         │
│  - Fetch issues (JQL + pagination)      │
│  - Transform (Jira → Catalyst schema)   │
│  - Download attachments                 │
│  - Upsert to ph_issues                  │
│  - Log to ph_sync_log                   │
└─────────────────────────────────────────┘
    │
    │ Supabase SDK (service-role)
    │
    ▼
┌─────────────────────────────────────────┐
│   Supabase PostgreSQL                   │
│   (Shared by all clients)               │
│                                         │
│   ph_issues                             │
│   ph_projects                           │
│   ph_attachments                        │
│   jira_identity_map                     │
│   ... (other JIRA tables)               │
└─────────────────────────────────────────┘
    ▲                              ▲
    │                              │
    │ Supabase SDK (user RLS)      │ Supabase SDK (user RLS)
    │                              │
┌───┴──────────────┐        ┌─────┴────────────────┐
│  Catalyst 45     │        │   CatyMobile         │
│  (Web)           │        │   (React Native)     │
│                  │        │                      │
│  SELECT * FROM   │        │  SELECT * FROM       │
│  ph_issues       │        │  ph_issues           │
│  WHERE ...       │        │  WHERE ...           │
└──────────────────┘        └──────────────────────┘
     ▼                            ▼
┌──────────────┐            ┌──────────────┐
│  Backlog     │            │  Work List   │
│  AllWork     │            │  Issue View  │
│  Detail      │            │  Kanban      │
└──────────────┘            └──────────────┘
```

---

## Current State (2026-05-14)

### Sync Status: FROZEN ❄️

**Configuration:**
```sql
SELECT * FROM jira_integration_config;
→ sync_enabled = false
  frozen_at = 2026-04-27
  freeze_note = 'Jira sync paused — Catalyst operating in native mode.'
  preserved_work_items = 2847
  preserved_projects = 18
  preserved_users = 156
  data_cutoff_year = 2026
```

**Why Frozen:**
- Phase 4 (2026-04-27): JIRA sync disabled to stabilize Catalyst in "native mode"
- All 2026 data preserved in `ph_issues` (not pruned)
- Edge functions remain in place; cron jobs disabled
- Webhook receiver remains active (but no Jira events are being sent)
- Both mobile and web continue to read from frozen snapshot

**Data Preservation:**
```sql
-- All Jira-mirror tables dropped (injira_*, sync_events, etc.)
-- Business data moved to native Catalyst tables:
  ph_issues ← (injira_issues + manual edits)
  ph_projects ← (injira_projects)
  jira_identity_map ← (user mappings, preserved)
```

**Edge Function Status:**
- ✅ `catalyst-full-sync` — Available for manual trigger
- ✅ `jira-bau-reload` — Available for manual trigger (BAU only)
- ✅ `wh-jira-webhook` — Available but not receiving events
- ❌ pg_cron jobs — All disabled
- ❌ Real-time sync — Paused

---

## Mobile-Specific Considerations

### 1. Network Reliability
CatyMobile may have intermittent connection. Use:
- Supabase offline persistence (local cache + sync queue)
- `@supabase/supabase-js` built-in offline support
- Optional: Implement app-level sync indicators

### 2. Bandwidth
Mobile networks may be metered. Optimize:
- Query only required fields (avoid `SELECT *`)
- Use pagination for lists (e.g., limit 50)
- Download attachments on-demand (not pre-fetch all)

### 3. Real-Time Subscriptions
Both platforms can subscribe to `ph_issues` table changes:

**Web:**
```typescript
supabase
  .channel('issues')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'ph_issues' },
    (payload) => updateUI(payload)
  )
  .subscribe();
```

**Mobile (same code):**
```typescript
supabase
  .channel('issues')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'ph_issues' },
    (payload) => updateUI(payload)
  )
  .subscribe();
```

---

## Data Consistency Strategy

### Row-Level Security (RLS) Enforces Parity

```sql
-- Every query through Supabase applies auth context
-- Mobile & web both authenticate as users → same RLS policies apply
-- Result: identical data scope for both clients
```

### Upsert Idempotency

```typescript
await supabase
  .from('ph_issues')
  .upsert(rows, { onConflict: 'issue_key' })
  // Safe to retry indefinitely — no duplicates created
```

### Soft Deletes Prevent Data Loss

```sql
-- Deleted issues marked with jira_removed_at, not physically deleted
-- App-layer filtering decides whether to show them
-- Both mobile & web see same "deleted" flag
```

---

## Future Re-Enablement

To resume JIRA sync:

### Step 1: Enable Toggle
```sql
SELECT enable_jira_sync('admin-user-uuid');
```

### Step 2: Trigger Full Sync
```bash
curl https://catalyst.supabase.co/functions/v1/catalyst-full-sync \
  -H "Authorization: Bearer anon_key" \
  -H "Content-Type: application/json" \
  -d '{"projects": ["BAU"], "year": "2026"}'
```

### Step 3: Verify Sync Logs
```sql
SELECT * FROM ph_sync_log ORDER BY completed_at DESC LIMIT 5;
```

### Step 4: Reconfigure Webhook
```
Jira Settings → Webhooks → Register endpoint:
  https://catalyst.supabase.co/functions/v1/wh-jira-webhook
  Events: jira:issue_created, jira:issue_updated, jira:issue_deleted
```

---

## Summary: Mobile & Web Sync Strategy

| Aspect | Strategy | Result |
|--------|----------|--------|
| **Database** | Single Supabase backend | Auto parity |
| **Tables** | Shared `ph_*` schema | Same data |
| **Auth** | User RLS policies apply equally | Identical scope |
| **Sync** | Frozen (no real-time pulls) | Snapshot mode |
| **Parity** | Query-time, not sync-time | Guaranteed if RLS is correct |
| **Updates** | Require manual full-sync or webhook re-enablement | Plan re-sync workflow |
| **Offline** | Supabase SDK handles (client-side queue) | No server-side queuing |
| **Conflict** | Last-write-wins (upsert on issue_key) | Acceptable for JIRA reads |

**Conclusion:**
CatyMobile and Catalyst 45 **automatically stay in sync** by querying the same Supabase database. No separate mobile-only sync logic is needed. Both platforms read from identical tables with identical RLS guards. Parity is enforced at the data layer, not the application layer.
