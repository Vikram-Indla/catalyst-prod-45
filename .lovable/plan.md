
## Jira Defect Sync — Implementation Plan

### Architecture Decision
Since `ph_issues` already receives all Jira data via the existing V2 sync pipeline (webhook + full-sync), we **mirror** Bug-type issues from `ph_issues` → `tm_defects` using a DB trigger + an initial backfill. This avoids duplicating Jira API calls.

### Step 1 — Migration: Add Jira columns to tm_defects
Add columns to `tm_defects` for maximum Jira data:
- `jira_key` (varchar, nullable, unique) — e.g. "BAU-123"
- `jira_source` (boolean, default false) — visual flag: "From Jira"
- `jira_project_key` (varchar) — source project
- `jira_status` (varchar) — raw Jira status name
- `jira_status_category` (varchar) — To Do / In Progress / Done
- `jira_assignee_name` (varchar) — display name from Jira
- `jira_reporter_name` (varchar)
- `jira_resolution` (varchar)
- `jira_created_at` (timestamptz)
- `jira_updated_at` (timestamptz)
- `last_synced_at` (timestamptz)
- `jira_parent_key` (varchar) — parent epic/story
- `jira_story_points` (numeric)
- `jira_sprint_name` (varchar)
- `jira_components` (text[])
- `jira_fix_versions` (text[])

### Step 2 — DB Trigger: Auto-mirror ph_issues bugs → tm_defects
Create a trigger on `ph_issues` (INSERT/UPDATE/DELETE) that:
- On INSERT/UPDATE where `issue_type = 'QA Bug'`: UPSERT into `tm_defects` matching on `jira_key`
- On DELETE: Soft-delete matching `tm_defects` row
- Maps fields: summary→title, description_text→description, priority, status, assignee, labels, components, etc.
- Sets `jira_source = true`

### Step 3 — Initial Backfill
Run a one-time SQL INSERT that copies all 507 existing QA Bugs from `ph_issues` into `tm_defects`.

### Step 4 — UI: Jira Origin Badge
In the Defects list component, show a small Jira icon/badge on rows where `jira_source = true`.
Display `jira_key` as an additional column.

### Step 5 — Bi-directional Delete
When a user deletes a Jira-sourced defect in Catalyst:
- Mark it as deleted in `tm_defects`
- Create an outbound sync event in `sync_outbound_queue` (or equivalent) for the existing outbound Edge Function to process the delete in Jira

### What this gives you:
- **Automatic**: Any Jira sync (webhook or manual "Sync Now") that updates `ph_issues` will auto-propagate bugs to `tm_defects` via the trigger
- **No new Edge Functions** for inbound — reuses the existing pipeline
- **Clear provenance**: `jira_source` flag + `jira_key` column
- **Maximum data**: 15+ Jira fields mapped

### Files to modify:
- 1 migration (schema + trigger + backfill)
- Defects list component (Jira badge + jira_key column)
- Defect detail/drawer (show Jira metadata section)

### NOT in scope:
- Outbound creation (confirmed: Catalyst-native defects stay local)
- Changing the existing Jira webhook receiver
- Modifying TestCycleCard, TestHubExecutionPage, or any other TestHub component
