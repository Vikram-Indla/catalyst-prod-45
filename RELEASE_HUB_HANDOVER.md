# Release Hub — Phase 0/1/2 Handover

Branch: `feature/date-pulse-phase2`
Date: 2026-06-20
Supabase project: `lmqwtldpfacrrlvdnmld`
Dev server: `http://localhost:8080`

---

## What was done in the prior session

### Release lifecycle — 5-stage model (COMPLETE)

The lifecycle was stripped from 9 stages down to 5 canonical stages. Changes landed in:

| File | Change |
|---|---|
| `src/lib/release-ops/lifecycle.ts` | `RELEASE_STAGES = ['draft','in_progress','qa','beta','production']`. Legacy 9-stage values aliased via `RELEASE_ALIAS`. Freeze-window guard triggers on `beta\|production`. |
| `src/pages/releasehub/ReleaseDetailPage.tsx` | Tracker reads stages dynamically from `useReleaseConfig()` → `rh_config_options`. Falls back to 5-stage `DEFAULT_STAGES`. Action buttons: "Send to QA" → `transition('qa')`, "Deploy to beta" → `transition('beta')`. |
| `src/components/kanban/adapters/releaseBoardAdapter.tsx` | 5 columns: draft/in-progress/qa/beta/production. Legacy aliases mapped into each column's `statuses[]`. |
| `src/pages/admin/AdminSidebar.tsx` | "Release Operations" nav item added (path `/admin/release-ops`). |
| `src/components/ui/StatusLozenge.tsx` | Display names added: `qa: "QA"`, `beta: "Beta"`, `production: "Production"`. |
| `src/components/ads/internal/status.ts` | `'production'` → done, `'qa'` + `'beta'` → inProgress. |
| Supabase migration `release_lifecycle_5stage` | 5 system rows in `rh_config_options` (draft/in_progress/qa/beta/production) + 2 terminal (rolled_back/cancelled). |

**DB state (post-migration):**
```
release_status rows in rh_config_options:
  value='draft'       color_category='todo'       sort_order=1  is_system=true
  value='in_progress' color_category='in_progress' sort_order=2  is_system=true
  value='qa'          color_category='in_progress' sort_order=3  is_system=true
  value='beta'        color_category='in_progress' sort_order=4  is_system=true
  value='production'  color_category='done'        sort_order=5  is_system=true
  value='rolled_back' color_category='todo'        sort_order=6  is_system=false
  value='cancelled'   color_category='todo'        sort_order=7  is_system=false
```

Admin panel (`/admin/release-ops`) verified: 5 system stage rows each with System badge + Edit control.
Tracker on `/release-hub/[id]` verified: 5 circles, live from `rh_config_options`.

---

## What is pending

### Phase 0 — Seed data (DO FIRST — pre-requisite for testing Phases 1 and 2)

**Step 0 before any seed:** Query Supabase MCP `list_tables` and then `execute_sql` to inspect actual schemas:
```sql
-- Check actual column names for each seed table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
  'rh_freeze_windows', 'rh_production_events', 'rh_sop_templates',
  'rh_release_work_items', 'rh_release_brs'
)
ORDER BY table_name, ordinal_position;
```

Then get a release ID to seed against:
```sql
SELECT id, name, status, planned_release_date FROM rh_releases LIMIT 8;
```

**Seed targets:**

1. **`rh_freeze_windows` — 4 rows:**
   - "Q3 Code Freeze" — Jul 15–Jul 22 2026, target_env='all', status='active'
   - "KSA National Day Freeze" — Sep 22–Sep 23 2026, target_env='production', status='active'
   - "Year-End Freeze" — Dec 24 2026–Jan 2 2027, target_env='all', status='active'
   - One window that CONFLICTS with `planned_release_date` of release `11111111-0000-0000-0000-000000000007` — the calendar renders a red "Freeze conflict" label when a release date falls inside a freeze window

2. **`rh_production_events` — 5 rows linked to real release IDs:**
   - 2 successful deployments (`result='success'`, `event_type='deployment'`)
   - 1 partial deployment (`result='partial'`)
   - 1 rollback (`result='rollback'`, `event_type='rollback'`)
   - 1 in-progress deployment (`result='in_progress'`)

3. **`rh_sop_templates` — 3 rows:**
   - "Standard Web Release SOP" (8 steps, category='standard')
   - "Hotfix Emergency SOP" (4 steps, category='emergency')
   - "Feature Flag Rollout SOP" (6 steps, category='feature_flag')

4. **Link 3-5 `ph_issues` to release `11111111-0000-0000-0000-000000000007`** via the junction table. Verify table name first (likely `rh_release_work_items` or `rh_release_scope_items`).

5. **Link 2 `business_requests` to that release** via the appropriate junction table (verify first).

---

### Phase 1 — Scope tab enhancement

**File:** `src/components/releasehub/detail/ReleaseDetailTabs.tsx`
**Location:** `ScopeTab` function, lines 100–129

**Current state:** Renders 3 plain `<div>` sections — Business requests, Sprints, Work items — using row divs. Work items show only `workItemKey` + `inclusionSource`. No JiraTable, no action buttons, no chips.

**Hook contract:** `useReleaseScope(releaseId)` returns `{ brs: [], sprints: [], workItems: [] }`. The `workItems` array has `{ id, workItemKey, inclusionSource }`. Verify the full shape by reading the hook in `src/hooks/useReleaseHub.ts`.

**What to build:**

1. **Work items section — replace the plain div list with JiraTable:**
   - Import from `src/components/shared/JiraTable/`
   - Load linked `ph_issues` by joining via the junction table — need a new query or extend `useReleaseScope`
   - Columns: key cell (`makeKeyCell` with `JiraIssueTypeIcon` as 4th arg), summary, status (`makeStatusCell`), assignee, priority — using canonical cell factories
   - If no linked issues: empty state "No work items in scope"

2. **Toolbar above the table — two buttons:**
   - "Link work item" button (`@atlaskit/button` appearance="default") — toast "Coming soon" for now, or modal if time allows
   - "Link BR" button (`@atlaskit/button` appearance="default") — same pattern

3. **BR chips row:**
   - One chip per linked BR from `scope.brs[]`
   - Each chip: `<JiraIssueTypeIcon type='Business Request' size={14} />` + BR title text
   - If no BRs: subtle empty state "No linked business requests"

4. **Sprint chips row:**
   - One chip per sprint from `scope.sprints[]`
   - Each chip: sprint name text

---

### Phase 2 — Calendar "↻ Re-run all" button

**File:** `src/pages/releasehub/ReleaseCalendarPage.tsx`
**Location:** Lines 216–225, the toolbar `<div>` that contains the `Seg` controls and the Previous/Today/Next navigation buttons

**Current toolbar structure (line 216):**
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
  <Seg options={[...product/project...]} ... />
  <Seg options={[...month/quarter...]} ... />
  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
    <button /* previous */ />
    <button /* today */ />
    <span /* month label */ />
    <button /* next */ />
  </div>
</div>
```

**What to add:** A "↻ Re-run all" button inside the `marginLeft: 'auto'` div, before the navigation buttons. It should:
- Use `@atlaskit/button` appearance="subtle"
- Call `useQueryClient().invalidateQueries({ queryKey: ['release-hub', 'calendar'] })` on click (triggers refetch of `useReleaseCalendar`)
- Show `@atlaskit/spinner` size="small" while `isFetching` from `useReleaseCalendar()`
- Be `disabled` while fetching

Query key: check `useReleaseCalendar` in `src/hooks/useReleaseHub.ts` to confirm the exact `queryKey` array, then pass that same key to `invalidateQueries`.

---

## Constraints (from CLAUDE.md — non-negotiable)

- `git add` explicit paths only — NEVER `git add -A` or `git add .`
- ADS tokens only: `var(--ds-*)` — no hardcoded hex
- JiraTable for ALL work item lists — never a new `<table>` element
- No forking canonical components — adapt via props
- No typed domain fallbacks: `|| 'Story'` or `|| 'Epic'` are banned — silence beats lies
- After any Supabase upsert, do a follow-up SELECT to confirm the row landed (trigger chain on `ph_issues` silently drops rows that fail guards)
- Verify schema before writing any field access (`row.field_name` must exist as a column)

---

## Copy-paste block for next conversation

Paste the block below as the first message in the new conversation.

```
Release Hub — Phase 0/1/2 Execution

Branch: feature/date-pulse-phase2
Dev server: http://localhost:8080
Supabase project: lmqwtldpfacrrlvdnmld

The release lifecycle is fully wired — 5 canonical statuses (draft, in_progress, qa, beta,
production) live in rh_config_options and are rendered in the Tracker and admin panel.
No lifecycle changes needed.

Execute Phases 0, 1, and 2 in order. Follow all CLAUDE.md rules (ADS tokens only, JiraTable
for work items, no git add -A, explicit staged paths only, no typed domain fallbacks).

## Phase 0 — Seed data (DO THIS FIRST)

Step 0: Run this query via Supabase MCP to verify column names before seeding:
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('rh_freeze_windows', 'rh_production_events', 'rh_sop_templates',
    'rh_release_work_items', 'rh_release_brs')
  ORDER BY table_name, ordinal_position;

Also run: SELECT id, name, status, planned_release_date FROM rh_releases LIMIT 8;

Then seed via execute_sql:

1. rh_freeze_windows — 4 rows:
   - "Q3 Code Freeze" (Jul 15–Jul 22 2026, target_env='all', status='active')
   - "KSA National Day Freeze" (Sep 22–Sep 23 2026, target_env='production', status='active')
   - "Year-End Freeze" (Dec 24 2026–Jan 2 2027, target_env='all', status='active')
   - One row whose date range overlaps planned_release_date of release
     11111111-0000-0000-0000-000000000007 so "Freeze conflict" fires in the calendar

2. rh_production_events — 5 rows linked to real release IDs (from the SELECT above):
   - 2 successful deployments (result='success', event_type='deployment')
   - 1 partial deployment (result='partial')
   - 1 rollback (result='rollback', event_type='rollback')
   - 1 in-progress (result='in_progress')

3. rh_sop_templates — 3 rows:
   - "Standard Web Release SOP" (8 steps, category='standard')
   - "Hotfix Emergency SOP" (4 steps, category='emergency')
   - "Feature Flag Rollout SOP" (6 steps, category='feature_flag')

4. Link 3–5 ph_issues to release 11111111-0000-0000-0000-000000000007 via the junction
   table (verify table name from the schema query above).

5. Link 2 business_requests to that release via the appropriate junction table.

After each insert: run a SELECT to confirm rows landed (Supabase trigger chains can silently
drop rows — never trust insert success alone).

## Phase 1 — Scope tab (src/components/releasehub/detail/ReleaseDetailTabs.tsx)

Read the file first. ScopeTab is at lines 100–129. It uses useReleaseScope(releaseId).
Hook returns: { brs: [], sprints: [], workItems: [] }
workItems shape: { id, workItemKey, inclusionSource }

Replace/enhance ScopeTab:
1. Work items section — use JiraTable (src/components/shared/JiraTable/).
   Need to query ph_issues joined via the junction table (extend useReleaseScope or add
   a new useReleaseWorkItems hook). Columns: key (with JiraIssueTypeIcon as 4th arg to
   makeKeyCell), summary, status, assignee, priority.
2. Toolbar above table with two @atlaskit/button appearance="default" buttons:
   - "Link work item" → toast "Coming soon"
   - "Link BR" → toast "Coming soon"
3. BR chips row: one chip per scope.brs[] item, each showing
   <JiraIssueTypeIcon type='Business Request' size={14} /> + BR title.
   Empty state: "No linked business requests"
4. Sprint chips row: one chip per scope.sprints[] item, showing sprint name.

## Phase 2 — Calendar "↻ Re-run all" button

File: src/pages/releasehub/ReleaseCalendarPage.tsx
Location: the toolbar div at line ~216 that contains the Seg controls and the
Previous/Today/Next nav buttons.

Add "↻ Re-run all" button inside the marginLeft:'auto' nav div, before the Previous button:
- @atlaskit/button appearance="subtle" label "↻ Re-run all"
- onClick: useQueryClient().invalidateQueries({ queryKey: [exact key from useReleaseCalendar] })
- shows @atlaskit/spinner size="small" while isFetching from useReleaseCalendar()
- disabled while fetching

First: grep useReleaseCalendar in src/hooks/useReleaseHub.ts to get the exact queryKey,
then pass that key to invalidateQueries.

## After each phase: verify via Chrome MCP DOM probe, then commit with explicit file paths only.
```
