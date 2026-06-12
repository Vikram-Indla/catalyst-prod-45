# CLAUDE CODE HANDOVER — Workflows Admin (Statuses + Per-Type Workflows)

> Paste this entire file into Claude Code as the task brief. Treat it as a fresh build.
> Source of truth for ALL visuals and interactions: `02-workflows-admin-mockup-v3.html`
> (open it in a browser next to the code; replicate it, do not reinterpret it).
> Jira is the upstream design reference. Catalyst conventions below are binding.

---

## 0. MISSION

Replace `/admin/workflows` with a two-section admin surface:

- **Section A — Status registry (global).** All 27 BAU statuses defined ONCE, grouped
  into collapsible category sections (To-Do, In-Progress, Done, Terminal). Database
  (`ph_workflow_statuses`) is the single source of truth. TypeScript enums in
  `workflowDefinitions.ts` become a fallback used only when the DB returns zero rows.
- **Section B — Workflows (per work item type).** Atlaskit Tabs across 7 types:
  Story, Epic, Feature, Sub-task, QA Bug, Production Incident, Business Request.
  Each type owns: an ordered subset of registry statuses, exactly one initial status,
  and its own transition rules grouped by source status. Global rules (Any → On Hold,
  Any → Cancelled) are stored once and apply to every type.

- **Section B has two modes per type — Editor | Diagram** (mode toggle in the meta
  strip). Diagram is Jira-workflow-editor parity: status nodes laid out in
  category-ordered BFS layers from the initial status, draggable; transition
  arrows selectable (floating toolbar + Delete key) and deletable; "Add
  transition" = click source node → click destination node; start dot → initial
  status; dashed "Any status · global" node for global rules; unreachable
  statuses flagged with a red dot + tooltip. Editor and Diagram render from the
  SAME query data — a delete in one is instantly reflected in the other.

**HARD RULE — status name uniqueness.** One name = one status, globally, across
ALL work item types. Never two statuses with the same name scoped to different
types. Enforced three times: (1) DB unique index `uq_status_name_per_project`
(case-insensitive), (2) live inline validation in the Edit Status modal against
the full registry (excluding self), with the error pointing the admin at adding
the EXISTING status to the type's workflow instead, (3) `can_transition` and all
seeds resolve statuses by id, never by name string.

Do NOT carry over the old per-tab 14×14 transition matrix. Do NOT delete the
per-type dimension — that was the v1 mistake this brief corrects.

> Mockup version: `02-workflows-admin-mockup-v3.html` supersedes v2 — it adds the
> Diagram mode and real uniqueness validation. Replicate v3.

---

## 1. DECISION GATES — STOP AND ASK BEFORE CODING IF UNRESOLVED

- **DECISION-1 (category model).** Mockup shows 4 categories including red
  "Terminal". This conflicts with (a) Jira's 3-category model (grey/blue/green)
  and (b) Catalyst's hard 3-color StatusLozenge guardrail. Options:
  A) fold the 5 Terminal statuses into the Done category (guardrail-safe,
  Jira-parity) — preferred; B) extend the guardrail to 4 colors with explicit
  sign-off. Implement whichever Vikram confirms. The schema below is
  category-agnostic; only the `category` enum and lozenge mapping change.
- **DECISION-2 (global rules).** Global transitions require `from_status_id`
  NULLABLE and an `OR from_status_id IS NULL` branch in every transition-validation
  query. If BAU has no real global rules, drop them and simplify. Default: keep.

---

## 2. DATA MODEL (Supabase migrations — project ref nbygvcavxkiyqeqmsxbq)

All tables `ph_`-prefixed, project-scoped, soft-delete pattern (no hard DELETE;
follow the `ph_issues` guard-trigger precedent).

```sql
-- 2.1 Global status registry (extend existing ph_workflow_statuses; do not recreate)
ALTER TABLE ph_workflow_statuses
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'todo'
    CHECK (category IN ('todo','in_progress','done','terminal')), -- DECISION-1 may drop 'terminal'
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#64748B',
  ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS uq_status_name_per_project
  ON ph_workflow_statuses (project_id, lower(name)) WHERE archived_at IS NULL;
-- exactly one default per (project, category):
CREATE UNIQUE INDEX IF NOT EXISTS uq_default_per_category
  ON ph_workflow_statuses (project_id, category) WHERE is_default AND archived_at IS NULL;

-- 2.2 Type ↔ status availability + per-type ordering + initial flag
CREATE TABLE IF NOT EXISTS ph_workflow_type_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  work_item_type text NOT NULL,          -- 'Story','Epic','Feature','Sub-task','QA Bug','Production Incident','Business Request'
  status_id uuid NOT NULL REFERENCES ph_workflow_statuses(id),
  position int NOT NULL DEFAULT 0,
  is_initial boolean NOT NULL DEFAULT false,
  UNIQUE (project_id, work_item_type, status_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_initial_per_type
  ON ph_workflow_type_statuses (project_id, work_item_type) WHERE is_initial;

-- 2.3 Transitions — per type; NULL from = global rule (DECISION-2)
CREATE TABLE IF NOT EXISTS ph_workflow_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  work_item_type text,                   -- NULL = applies to ALL types (global rule)
  from_status_id uuid REFERENCES ph_workflow_statuses(id),  -- NULL = from any status
  to_status_id uuid NOT NULL REFERENCES ph_workflow_statuses(id),
  UNIQUE (project_id, work_item_type, from_status_id, to_status_id)
);

-- 2.4 Consumer tracking (P0 — Consumers tab and tooltips depend on it)
CREATE TABLE IF NOT EXISTS status_consumers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES ph_workflow_statuses(id),
  consumer text NOT NULL,                -- 'kanban','jira_table','status_lozenge','detail_views','filter_dropdown','bulk_change'
  detail text,                           -- e.g. "5 items", "3 saved filters"
  UNIQUE (status_id, consumer)
);

-- RLS: authenticated read on all four; admin-role write. Mirror existing ph_ policies.
```

Validation function (Postgres or edge): `can_transition(project, type, from, to)` =
exact row match OR global row (`work_item_type IS NULL` and/or `from_status_id IS NULL`).
Kanban drag-drop and Bulk Change must call this, not client-side enums.

---

## 3. ATLASKIT COMPONENT MAP — NO SUBSTITUTIONS

| Mockup element | Atlaskit package / component |
|---|---|
| Create status, Save, Cancel, Delete | `@atlaskit/button/new` (appearance: primary / subtle / danger) |
| Work item type tabs | `@atlaskit/tabs` |
| Category lozenges, status lozenges | existing `CatalystStatusLozenge` (Storybook canonical) — do NOT fork |
| Edit Status modal | `@atlaskit/modal-dialog` (no shadcn Dialog — GlobalSearch lesson; use ModalTransition) |
| Modal tabs (General / Work item types / Consumers) | `@atlaskit/tabs` inside modal |
| Status name input, hex input, position | `@atlaskit/textfield` + `@atlaskit/form` (Field, HelperMessage, ErrorMessage) |
| Category dropdown, Copy-workflow-from, +Add pickers | `@atlaskit/dropdown-menu` / `@atlaskit/select` |
| Type availability checkboxes | `@atlaskit/checkbox` |
| Consumers hover, disabled-delete reason | `@atlaskit/tooltip` |
| Toasts (loading → success, error + retry) | `@atlaskit/flag` (AutoDismissFlag) |
| Delete confirmation | `@atlaskit/modal-dialog` appearance="danger" |
| Search filter | `@atlaskit/textfield` with search icon |
| Drag reorder (rows + chips) | `@atlaskit/pragmatic-drag-and-drop` (NOT @dnd-kit on this surface — ADS parity) |
| Icons | `@atlaskit/icon` glyphs only (edit, trash, chevron-down/right, add, drag-handle, search, download) |
| Empty transition group | `@atlaskit/empty-state` (compact) or inline per mockup |
| Workflow diagram | custom SVG component (`WorkflowDiagram.tsx`) — nodes/edges per mockup; do NOT pull a graph library for MVP; arrowheads via SVG markers; all colors from tokens + statusCategoryColors.ts |
| Diagram edge toolbar | absolutely-positioned `@atlaskit/button` group, mirrors mockup `.edge-toolbar` |

Colors: ONLY `var(--ds-*)` tokens. The four status accents (#64748B, #2563EB,
#16A34A, #DC2626) live in ONE constant file (`statusCategoryColors.ts`) — nowhere
else hardcoded. Dark mode comes free from tokens; ONE `.dark` override block max
(RCA S7 rule), ideally zero.

Typography: 24/653 page H1, 20/653 section H2, 16/653 group headers, 12/653 table
headers, 14/400 cells, 11/600 form labels, 11/400 helpers. Sentence case everywhere.
Banned vocabulary applies: no "Sprint", no FORGE terms on any surface string.

---

## 4. FILE MAP

```
src/pages/admin/WorkflowAdminPage.tsx        -- rewrite: Section A + Section B composition
src/components/admin/StatusRegistryTable.tsx -- category sections + table (Section A)
src/components/admin/StatusRegistryCards.tsx -- mobile <1024px card layout
src/components/admin/EditStatusModal.tsx     -- 3 tabs per mockup
src/components/admin/WorkflowTypePanel.tsx   -- meta strip + status lanes + transitions
src/components/admin/TransitionGroup.tsx     -- one FROM group (incl. global variant)
src/components/admin/WorkflowDiagram.tsx     -- SVG diagram mode (layout, drag, edge select/delete, add-transition)
src/components/admin/diagramLayout.ts        -- pure BFS-layer layout fn (unit-test this)
src/hooks/useWorkflowStatuses.ts             -- registry hook (below)
src/hooks/useTypeWorkflow.ts                 -- per-type statuses + transitions
src/hooks/useStatusConsumers.ts              -- tooltip + Consumers tab data
src/constants/statusCategoryColors.ts        -- the ONLY hex constants
supabase/migrations/<ts>_workflow_admin.sql  -- section 2 DDL + seed of 27 statuses,
                                                7 type workflows, transitions (copy the
                                                exact data arrays from the mockup's
                                                <script> block: STATUSES, WORKFLOWS,
                                                GLOBAL_RULES — they are consistency-checked)
```

## 5. HOOKS + SYNC

```ts
// keys
['workflow-statuses', projectKey]                    // registry
['type-workflow', projectKey, workItemType]          // subset + transitions
['status-consumers', statusId]
// staleTime 5min, SWR fallback. Every mutation:
queryClient.invalidateQueries({queryKey:['workflow-statuses',projectKey]});
queryClient.invalidateQueries({queryKey:['type-workflow',projectKey]}); // all types
```
Consumers (Kanban, JiraTable, StatusLozenge, detail views, FilterDropdown, Bulk
Change) switch from hardcoded enums to `useWorkflowStatuses` /
`can_transition`. Target: re-render ≤200ms after save (measure, don't assume).

## 6. BEHAVIOR SPEC (each is a Playwright assertion)

1. Registry renders 4 (or 3 per DECISION-1) collapsible category sections; counts match DB.
2. Default status row carries 2px brand left border + "Default" tag; enforcing
   one-default-per-category happens server-side (unique index), UI swaps optimistically.
3. "Available for" column renders type chips; "All types" lozenge when unrestricted.
4. Search filters rows live across both views and auto-expands sections.
5. View toggle switches table/cards; <1024px forces cards automatically.
6. Edit modal: Create mode disables Work item types + Consumers tabs with tooltip;
   name "Duplicate" (or any existing name) shows inline ErrorMessage and blocks save.
7. Save fires loading flag → success flag ("Status updated. All components refreshed.");
   failure fires error flag with Retry.
8. Delete disabled (with tooltip reason) when status is a transition destination
   elsewhere or has live work items; confirm dialog states blast radius from
   status_consumers + ph_work_items counts (real numbers, not copy).
9. Type tabs switch workflows; each shows meta strip (status count, rule count,
   initial status) + "Copy workflow from…" which clones type_statuses + transitions
   from the chosen type (skip duplicates, never overwrite).
10. Status lanes: only registry statuses available for that type appear in +Add picker;
    exactly one Initial flag; removing a status from a type warns if transitions reference it.
11. Transitions grouped by source; global group pinned first with "Global · all types"
    badge; editing a global rule shows an all-types blast-radius confirm.
12. Keyboard: Esc closes dialogs (confirm before edit), Enter saves from name field,
    full tab order, visible focus rings, `prefers-reduced-motion` respected.
13. Dark/light: zero hardcoded colors outside statusCategoryColors.ts (run ads-validator).
14. Editor | Diagram toggle per type; both modes show the same meta strip; switching
    modes preserves type selection and unsaved nothing (all edits are immediate mutations).
15. Diagram: nodes draggable (positions persisted per user in localStorage-free store —
    use a `ph_user_prefs` jsonb or React state only for MVP); Auto-layout resets; zoom
    −/Fit/+ between 0.5× and 1.6×; canvas pans on empty-space drag.
16. Diagram: clicking an arrow selects it and shows "{from} → {to}" toolbar with Delete;
    Delete/Backspace key removes the selected arrow; deleting a GLOBAL arrow warns it
    affects all 7 types; the Editor list reflects the change without reload (same cache key).
17. Diagram: Add transition mode — pick source then destination; self-transitions
    rejected; duplicates rejected with error flag; Esc cancels the mode.
18. Diagram: start dot connects to the initial status; statuses with no inbound
    transition render a red dot with tooltip "No inbound transition — unreachable
    from the initial status".
19. Name uniqueness: creating or renaming to any existing registry name (case-insensitive,
    any category, any type) blocks save with the inline error from the mockup; server
    returns 409 from the unique index as the backstop.

## 7. PIPELINE

ads-validator before PR → regression sweep on /admin/workflows → jira-compare
parity pass (Jira statuses page is the reference) → CRUD acceptance on a canonical
status ("Demo Status") as the gate. File defects as JIRA bugs on the BAU board.

## 8. OUT OF SCOPE

Workflow diagram visualization (keep existing Diagram toggle untouched), Jira sync
timestamps, bulk status migration, archiving UI (column exists in schema only),
cross-project inheritance.
