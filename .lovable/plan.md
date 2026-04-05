
# Jira Sync Comprehensive Audit & Fix Plan

## ROOT CAUSE ANALYSIS

### Issue 1: "15 hours ago" — Sync log never completes
The edge function (`wh-jira-sync`) crashes/times out after processing ~4,100 issues (BAU + ICP). It starts IP but hits Deno's wall clock limit → `shutdown`. The final `completed_at` update never runs, so `ph_sync_log` stays `status: 'running'` forever. The "UPDATED" column queries for `status IN ('success','warning')` and finds nothing recent → falls back to stale `last_synced_at`.

**Fix:** Update edge function to write `completed_at` after EACH project (not just at the end). Also mark previous stuck "running" entries as "timeout" on startup.

### Issue 2: Pre-2026 issues included
BAU has 3,022 issues from before 2026. The JQL uses `updated >= -360d` (12 months lookback), which pulls issues created in 2025 that were merely *updated* in 2026. This is correct Jira behavior — syncing recently-touched issues regardless of creation date.

**Decision needed:** Keep all recently-updated issues (current behavior) OR filter display to 2026-created only? I recommend keeping the sync as-is (it's correct) but noting this is by design.

### Issue 3: Missing Jira flags across hubs
Many hubs consume `ph_issues` data but don't show a Jira origin indicator.

## HUB-BY-HUB AUDIT

| Hub | Jira Data Source | Jira Flag Present? | Fix Needed |
|-----|-----------------|-------------------|------------|
| **Home** (ForYou) | `ph_issues` via TransitionsTab, DetailPanel | ❌ No flag | Add Jira chip to work items |
| **StrategyHub** | `es_initiative_epics` → links to `ph_issues` | ❌ No flag | Add flag on linked epics |
| **ProductHub** | Initiatives, Cards, Roadmap — mostly `ph_initiatives` not `ph_issues` | ⚠️ Partial | Check if cards show Jira key |
| **ProjectHub** | `ph_issues` (primary), AllProjectsTable, WorkItems, Dashboard | ✅ Sync chip on projects | Fix UPDATED column, add flag on work items |
| **ReleaseHub** | `rh_release_issues` linked to `ph_issues` | ⚠️ Partial | Add Jira badge on release items |
| **TestHub** | `tm_defects` mirrored from `ph_issues` | ✅ "From Jira" badge | Already done |
| **IncidentHub** | `ph_issues` where type='Production Incident' | ❌ No flag | Add Jira key column/badge |

## EXECUTION PLAN (in priority order)

### Fix 1: Edge function — per-project completion tracking
- Update `wh-jira-sync` to write `completed_at` after each project batch
- Clean up stuck "running" entries on startup
- **Impact:** Fixes "15 hours ago" immediately

### Fix 2: ProjectHub UPDATED column
- Fall back to `MAX(last_synced_at)` from `ph_issues` when no completed sync log exists
- **Impact:** Shows accurate "just now" after sync

### Fix 3: Reusable `<JiraSyncChip>` component
- Small chip showing Jira icon + key (e.g., "BAU-1234")
- Reusable across all hubs

### Fix 4: Add Jira flags to IncidentHub list
- Add `jira_key` column to incident grid

### Fix 5: Add Jira flags to Home/ForYou
- Show Jira chip on work items in transitions/detail panel

### Fix 6: Add Jira flags to ReleaseHub items
- Show Jira badge on release issue rows

**Note:** StrategyHub and ProductHub don't directly display `ph_issues` rows in most views — their Jira linkage is indirect through initiative-epic joins. Adding flags there is lower priority.
