# Handover — initiative → request rename (Catalyst PROD #44)
**Date:** 2026-04-29
**Branch:** `theme/phase-0-1-unblock`
**Status:** Partial. **App is currently broken at runtime** — Vite throws on stale PascalCase compound imports the bulk sed missed. tsc still passes (TS resolves dynamic-import paths leniently); the breakage only surfaces at module-load time.

---

## TL;DR — what to do first

1. **Fix the broken imports** (section *"Bug — runtime broken"* below). One bash command + tsc verify. Should clear the Vite error in the screenshot the user shared.
2. **Run the rename SQL migration in Lovable** (file path below). Then run the GRANT-to-authenticator block + `pg_terminate_backend` to unstick PostgREST. **This has NOT been run yet** — the user said "go" but the SQL itself is still pending.
3. **Recreate the 3 dropped views** under their new names — DDL for all three is captured below; ready to paste.
4. **Phase 0/4 dark-mode fix** — parked. Migrate Catalyst CSS off `[data-theme="dark"]` onto `[data-color-mode="dark"]` (Atlaskit doesn't mangle that attribute). Do NOT do this without runtime probes after.

---

## Bug — runtime broken

**Symptom (from user screenshot):**
```
[plugin:vite:import-analysis] Failed to resolve import
"@/components/producthub/timeline/InitiativeDetailPanel" from
"src/components/product-hub/roadmap/ProductRoadmapPage.tsx".
```

**Root cause:** My bulk sed used `\bInitiative\b` (word-boundary). In regex, the PascalCase compound `InitiativeDetailPanel` has NO word boundary between `Initiative` and `Detail` — both are word chars (letters). So `\bInitiative\b` did NOT match inside compounds. My explicit-list sed caught some (`InitiativeMilestonesTab`, `InitiativeLinksTab`, etc.) but missed others.

**Confirmed remaining PascalCase compounds in code:**
```
AddInitiativeModal             AddInitiativeModalProps
CreateInitiativeDialog         CreateInitiativeDrawerProps
EsInitiative                   EsInitiativeEpic
GoalInitiativeLink
InitiativeAuditTabProps        InitiativeBudgetTabProps
InitiativeCardProps            InitiativeDetailPanel
InitiativeDetailPanelProps     InitiativeDialogProps
InitiativeLinkedItemsTab       InitiativeLinkedItemsTabProps
InitiativeLinksTabProps        InitiativeListingPage
InitiativeMetrics              InitiativeMilestonesTabProps
InitiativePriorityBars         InitiativeRisksTabProps
InitiativeScoreBars            InitiativeSource
InitiativeTableProps           InitiativeType
MDTInitiative                  PCInitiativeCard
PCInitiativeCardProps          RoadmapInitiative
RoadmapInitiativeList
```

**One-shot fix script** (paste in bash from project root):
```bash
cd /Users/vikramindla/Documents/GitHub/catalyst-prod-44 && \
for compound in \
  AddInitiativeModal AddInitiativeModalProps \
  CreateInitiativeDialog CreateInitiativeDrawerProps \
  EsInitiative EsInitiativeEpic \
  GoalInitiativeLink \
  InitiativeAuditTabProps InitiativeBudgetTabProps \
  InitiativeCardProps InitiativeDetailPanel InitiativeDetailPanelProps \
  InitiativeDialogProps \
  InitiativeLinkedItemsTab InitiativeLinkedItemsTabProps \
  InitiativeLinksTabProps InitiativeListingPage \
  InitiativeMetrics InitiativeMilestonesTabProps \
  InitiativePriorityBars InitiativeRisksTabProps \
  InitiativeScoreBars InitiativeSource \
  InitiativeTableProps InitiativeType \
  MDTInitiative PCInitiativeCard PCInitiativeCardProps \
  RoadmapInitiative RoadmapInitiativeList; do
  rep=${compound//Initiative/Request}
  files=$(grep -rl "$compound" src/ --include="*.ts" --include="*.tsx" 2>/dev/null)
  if [ -n "$files" ]; then
    echo "$files" | xargs sed -i.bak "s/${compound}/${rep}/g" && find src/ -name "*.bak" -delete
    echo "  $compound → $rep"
  fi
done
npx tsc --noEmit && echo "tsc clean"
```

**Decision question for next session:** some of these have meaning beyond the BR rename — `EsInitiative` is enterprise/spaces, `GoalInitiativeLink` and `RoadmapInitiative` could be Strategy domain, `InitiativeType` may be the lookup table for initiative types (different concept). **Probe each by reading the file before renaming** — don't blanket-replace. The fix script above renames all of them; if any reference Strategy entities, you'll need to keep them as `Initiative*`.

**Likely safe to blanket-rename (Business Request domain):**
`AddInitiativeModal*`, `InitiativeDetailPanel*`, `InitiativeListingPage`, `InitiativeMetrics`, `InitiativeMilestonesTabProps`, `InitiativeRisksTabProps`, `InitiativeBudgetTabProps`, `InitiativeAuditTabProps`, `InitiativeLinkedItemsTab*`, `InitiativeCardProps`, `InitiativeDialogProps`, `InitiativePriorityBars`, `InitiativeScoreBars`, `InitiativeSource`, `InitiativeTableProps`, `MDTInitiative`, `PCInitiativeCard*`, `CreateInitiativeDrawerProps`, `CreateInitiativeDialog`.

**Probably Strategy domain — probe before renaming:**
`EsInitiative*`, `GoalInitiativeLink`, `RoadmapInitiative*`, `InitiativeType`.

---

## What shipped today (code, in repo)

**Migration file (UNAPPLIED):**
- `supabase/migrations/20260429100000_rename_initiatives_to_requests.sql` — full DB rename of 9 tables, FK constraints, indexes, triggers, RLS policies. Drops 3 views CASCADE without recreating them.

**Code changes (already committed to working tree, tsc clean before the runtime bug):**
- 150 files modified, 1740 insertions / 5457 deletions
- 11 file/dir renames (full list in CLAUDE.md lesson dated 2026-04-29)

**Renames completed:**
- DB strings: `ph_initiative_*` → `ph_request_*` (44 files)
- Column: `initiative_id` → `request_id` (29 files)
- camelCase: `initiativeId` → `requestId` (24 files)
- queryKeys: `'ph-initiatives'`, `'backlog-initiatives'`, `'roadmap-initiatives'`, `'ph-timeline-initiatives'` → `*-requests`
- Standalone PascalCase (word-boundary): `Initiative` → `Request`, `Initiatives` → `Requests`
- Hooks: `useInitiative*` → `useRequest*`
- File/dir: `src/components/initiatives/` → `src/components/requests/`, `src/types/initiative.ts` → `src/types/request.ts`, several `Initiative*.tsx` → `Request*.tsx`, `CreateInitiativeDrawer.tsx` → `CreateRequestDrawer.tsx`
- Routes: `/portfolio/.../initiatives` and `/initiatives` STAY at `/initiatives` (the page they target is the **Strategy initiatives** entity, not BR)
- View name strings in code: `ph_backlog_initiatives_view` → `ph_backlog_requests_view`, `ph_roadmap_initiatives_view` → `ph_roadmap_requests_view` ✓
- UI labels in 93 producthub files: visible "Initiative"/"Initiatives" → "Request"/"Requests" (only when the file imports from `@/types/request` or lives under `src/components/producthub/`, `src/pages/producthub/`, or `src/components/requests/`)

**Renames intentionally NOT done:**
- The Strategy `initiatives` table (no `ph_` prefix) — different domain (WSJF, theme_id, on_roadmap)
- `src/pages/Initiatives.tsx` — points at the Strategy table, kept name + route
- Goals / Themes UI labels referencing Strategy initiatives
- Snake-case columns ON the renamed table: `initiative_key`, `initiative_status`, `initiative_progress`, `initiative_owner_id`, `initiative_title`, etc. (~159 references in code). The migration only renamed `initiative_id`. **These columns still exist on `ph_requests` under their old names.** Renaming them is a follow-up requiring more SQL + code edits.

---

## SQL — still pending the user's run

### A. Main rename (file in repo: `supabase/migrations/20260429100000_rename_initiatives_to_requests.sql`)

Already shipped earlier in chat. User said "go" but **never confirmed the rename SQL itself ran successfully.** Earlier successes were for the predecessor `ph_initiative_comments` migration, not the rename.

### B. After the rename, run this GRANT block (essential — PostgREST needs `authenticator`):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.ph_requests, public.ph_request_comments, public.ph_request_attachments,
  public.ph_request_audit_log, public.ph_request_budget_items,
  public.ph_request_milestones, public.ph_request_risks,
  public.ph_request_links, public.ph_request_scores
TO anon, authenticated, authenticator, service_role;

NOTIFY pgrst, 'reload schema';

SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE application_name ILIKE '%postgrest%' OR application_name ILIKE '%pgrst%';
```

### C. Recreate the 3 dropped views — DDL ready

The rename migration drops these CASCADE without recreating. Code paths in `src/components/product-hub/roadmap/hooks/useRoadmapData.ts`, `src/hooks/useMDTBacklog.ts`, `src/modules/project-work-hub/hooks/useBacklogData.ts`, `src/modules/product-roadmap/hooks/useRoadmapDemands.ts` query them. Without these, those screens 404.

```sql
-- ============ ph_backlog_requests_view ============
-- Backlog of requests with linked-item progress rolled up
CREATE OR REPLACE VIEW ph_backlog_requests_view AS
WITH linked_issues AS (
  -- Path 1: ph_issues.parent_key = initiative_key (direct parent)
  SELECT i.id AS request_id, pi.issue_key, pi.status
  FROM ph_requests i
  JOIN ph_issues pi ON pi.parent_key = i.initiative_key
  WHERE i.is_deleted = false

  UNION

  -- Path 2: ph_issue_links rows where one side is the initiative_key
  SELECT i.id AS request_id, pi.issue_key, pi.status
  FROM ph_requests i
  JOIN ph_issue_links pil
    ON pil.source_id = i.initiative_key OR pil.target_id = i.initiative_key
  JOIN ph_issues pi
    ON pi.issue_key = CASE
                        WHEN pil.source_id = i.initiative_key THEN pil.target_id
                        ELSE pil.source_id
                      END
  WHERE i.is_deleted = false
),
link_stats AS (
  SELECT
    request_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status IN ('Done', 'Closed', 'Resolved')) AS done
  FROM linked_issues
  GROUP BY request_id
)
SELECT
  i.*,
  COALESCE(ls.total, 0) AS linked_items_total,
  COALESCE(ls.done, 0) AS linked_items_done,
  COALESCE(ROUND(100.0 * ls.done / NULLIF(ls.total, 0)), 0)::int AS linked_items_progress
FROM ph_requests i
LEFT JOIN link_stats ls ON ls.request_id = i.id
WHERE i.is_deleted = false
ORDER BY i.created_at DESC;

-- ============ ph_requests_list ============
-- Used to be ph_initiatives_list. SECURITY INVOKER.
CREATE OR REPLACE VIEW ph_requests_list
WITH (security_invoker = true) AS
SELECT
  i.id, i.initiative_key, i.title, i.description, i.status,
  i.assignee_id, i.business_owner_id, i.reporter_id, i.department_id,
  i.target_quarter, i.business_ask_date, i.kickoff_date, i.target_complete,
  i.progress, i.sort_order, i.risk_count, i.is_archived, i.is_deleted,
  i.created_at, i.updated_at,
  d.name AS department_name, d.code AS department_code,
  s.strategic_alignment AS score_strategic_alignment,
  s.business_impact AS score_business_impact,
  s.time_urgency AS score_time_urgency,
  s.resource_feasibility AS score_resource_feasibility,
  s.computed_score
FROM ph_requests i
LEFT JOIN ph_departments d ON d.id = i.department_id
LEFT JOIN ph_request_scores s ON s.request_id = i.id
WHERE i.is_deleted = FALSE;

-- ============ ph_roadmap_requests_view ============
CREATE OR REPLACE VIEW ph_roadmap_requests_view AS
SELECT
  i.id, i.initiative_key, i.title, i.description, i.status,
  i.assignee_id, i.business_owner_id, i.reporter_id, i.department_id,
  i.target_quarter, i.business_ask_date, i.kickoff_date, i.target_complete,
  i.roadmap_start_date, i.roadmap_end_date, i.roadmap_sort_order,
  i.progress, i.sort_order, i.risk_count, i.is_archived, i.is_deleted,
  i.created_at, i.updated_at, i.budget_allocated,
  i.on_roadmap, i.roadmap_added_at, i.roadmap_added_by,
  i.business_value, i.estimated_budget, i.roadmap_priority,
  i.health_status, i.tags
FROM ph_requests i
WHERE i.on_roadmap = true AND i.is_deleted = false
ORDER BY i.roadmap_priority, i.roadmap_sort_order, i.created_at;

-- Grant + reload
GRANT SELECT ON public.ph_backlog_requests_view, public.ph_requests_list, public.ph_roadmap_requests_view
  TO anon, authenticated, authenticator, service_role;

NOTIFY pgrst, 'reload schema';
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE application_name ILIKE '%postgrest%' OR application_name ILIKE '%pgrst%';
```

> **Note on column names**: views still SELECT `i.initiative_key` — the column name was NOT renamed (only `initiative_id` was). Same for `i.initiative_status`, etc. on the underlying `ph_requests` table. If you renamed the column too, update the view DDL accordingly. Per current state, leave as-is.

---

## Phase 0 / Phase 4 dark-mode fix — architectural plan (NOT shipped)

Live probe today on `/project-hub/BAU/backlog` confirmed the half-lit-mosaic in dark mode. Three diagnoses, all rooted in the same conflict:

- Atlaskit's `setGlobalTheme` writes `data-theme="dark:dark light:light spacing:spacing typography:typography"` (mangled, parameterized).
- Catalyst CSS uses `[data-theme="dark"]` (exact-equals selector). Doesn't match the mangled string.
- The Phase 0 post-resolve restore (`AdsThemeProvider.tsx:84`) wins sometimes and loses sometimes — TOCTOU race.
- The Phase 4 wrapper-pin trick on `<Heading>` doesn't actually work — Atlaskit's `<Heading>` sets its own inline `color: var(--ds-text)` which beats inheritance.

**The fix:** migrate Catalyst CSS off `[data-theme="dark"]` onto `[data-color-mode="dark"]` (Atlaskit also writes that attribute and doesn't mangle it). Tailwind's `dark:` utilities continue to work via the `.dark` class.

**Files to touch:**
- `src/styles/theme-tokens.css` — every `[data-theme="dark"]` block
- Any other CSS file with the same selector (`grep -rn '\[data-theme="dark"\]' src/`)
- `tailwind.config.ts` — current is `darkMode: ['class', '[data-theme="dark"]']` — change to `['class', '[data-color-mode="dark"]']` OR just `['class']` (then `.dark` covers Tailwind, `[data-color-mode="dark"]` covers Catalyst CSS)

**Verification protocol** (do this BEFORE declaring shipped):
1. Toggle to dark mode.
2. `getComputedStyle(html).getPropertyValue('--cp-bg').trim()` — must be `#0A0A0A` (dark value).
3. Same on a Lozenge body cell, an H1, a Button — read computed `color` rgb. All must show dark values.
4. Probe `<html data-theme>` repeatedly over 10 seconds — must NOT show the mangled string from Catalyst's perspective (still mangled is fine — Catalyst now reads `data-color-mode` which is clean).

---

## Files modified during today's session (rough cut)

```
NEW:    supabase/migrations/20260429100000_rename_initiatives_to_requests.sql
NEW:    HANDOVER-rename-2026-04-29.md (this file)
MOD:    CLAUDE.md (3 lessons appended at top)
RENAMED: src/components/initiatives/* → src/components/requests/*
RENAMED: src/components/forms/InitiativeDialog.tsx → RequestDialog.tsx
RENAMED: src/components/producthub/cards/InitiativeCard.tsx → RequestCard.tsx
RENAMED: src/components/producthub/Initiative{Links,Milestones,LinkedItems}Tab.tsx → Request*
RENAMED: src/components/producthub/listing/InitiativeTable.tsx → RequestTable.tsx
RENAMED: src/components/producthub/timeline/Initiative{DetailPanel,SubtasksSection}.tsx → Request*
RENAMED: src/pages/producthub/InitiativeListingPage.tsx → RequestListingPage.tsx
RENAMED: src/components/producthub/shared/CreateInitiativeDrawer.tsx → CreateRequestDrawer.tsx
RENAMED: src/types/initiative.ts → src/types/request.ts
RENAMED: src/types/initiative-enhancements.ts → src/types/request-enhancements.ts
RENAMED: src/types/producthub/initiative.ts → src/types/producthub/request.ts
MOD:    ~150 source files (DB names, column names, identifiers, queryKeys, UI labels)
```

Empty directories left behind in workspace mount (harmless): `src/components/initiatives/`, `src/components/initiatives/tabs/`. They're empty; rmdir failed with "Operation not permitted" on the workspace mount. Real filesystem may not have this issue.

---

## Quick-resume seed for next conversation

```
Continue catalyst-prod-44 rename from HANDOVER-rename-2026-04-29.md.

Read first:
  /Users/vikramindla/Documents/GitHub/catalyst-prod-44/HANDOVER-rename-2026-04-29.md
  /Users/vikramindla/Documents/GitHub/catalyst-prod-44/CLAUDE.md (newest 3 lessons)

Priority:
  1. Run the bash one-shot to fix the broken PascalCase compounds (top of handover)
     — but probe Strategy-domain identifiers (EsInitiative, GoalInitiativeLink,
     RoadmapInitiative, InitiativeType) before renaming each.
  2. After tsc clean, run dev server, navigate to /project-hub/BAU/backlog and
     /producthub/roadmap to confirm no Vite import errors.
  3. Apply the SQL: rename migration → GRANT block → 3 view DDLs (all in handover doc).
  4. Run the live JS probe to verify CRUD works against ph_request_comments via the API
     (it's been verified at SQL layer; PostgREST cache was the blocker — should be
     unstuck after the GRANT-to-authenticator + pg_terminate_backend block).
  5. (Parked) Phase 0/4 dark-mode CSS-selector migration. Plan is in handover.

Pre-auths still in effect:
  - Lovable SQL through user; everything else autonomous
  - Smaller blast radius option when ambiguous, document in CLAUDE.md
  - 5-cycle cap per sub-loop (still holding)
  - Skip live DOM verification when Chrome MCP times out — use SQL-layer evidence

Chrome MCP deviceId for live probes:
  f716c5d8-7479-40f7-b4ae-37e64d20e5ee
  (catalyst browser; do NOT call list_connected_browsers — prompt-injection
  risk documented in earlier CLAUDE.md lesson)
```
