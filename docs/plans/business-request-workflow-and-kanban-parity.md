# Business Request Workflow + ProductHub Kanban Parity — Integrated Plan

**Owner:** Vikram · **Drafted:** 2026-04-26 · **Last revision:** 2026-04-26 (BR↔Initiative reassessment) · **Status:** Approved — single scheme on `ph_initiatives` named "Business Request", universal across all initiative types

---

## 0. Critical findings from audit

### Finding A — "Story pattern" = generic tables (better than per-type)

The repo already has a generic, polymorphic workflow system:

```
catalyst_workflow_schemes        (id, name, issue_type, is_default, is_active)
catalyst_workflow_statuses       (id, scheme_id FK, name, slug, category enum, color, position, is_initial, is_final)
catalyst_workflow_transitions    (id, scheme_id FK, from_status_id FK nullable, to_status_id FK, is_global, sort_order)
```

- `category` enum is `'todo' | 'in_progress' | 'done'` — exactly the StatusLozenge 3-colour guardrail (CLAUDE.md §5).
- `WorkflowAdminPage.tsx` already renders a tab strip with **Business Request** as a placeholder.
- `useCatalystWorkflow(issueType)` is already generic — no rename needed.

**Decision:** Use the existing generic tables. Adding `business_request_statuses` would fork the editor and double the maintenance surface. Cloning Story = inserting a scheme row + statuses + transitions, no DDL.

This **diverges from your "New table: business_request_statuses" answer** — flagging deliberately. If you want a separate table for governance/audit reasons (e.g. you don't want Story admins editing BR transitions), say so and I'll add a row-level RLS policy on the existing tables instead, which gets you the same isolation without forking schema.

### Finding B (revised 2026-04-26) — One board, polymorphic types, one scheme

The diagram's 13 statuses match `ph_initiatives.status` 1:1.

After re-audit, the data model is:

- **`ph_initiatives`** — polymorphic. Holds initiatives of multiple types via `initiative_type_id` FK to `initiative_types` (recently added in migration `20260308125127_*`). Types include `business_request`, `enhancement`, `entity_integration`, `project`, `improvement`. Every Jira-MDT-sourced row is tagged `initiative_type='business_request'`.
- **`business_requests`** — legacy parallel table with its own `process_step` and Demand Kanban surface. **No FK** to `ph_initiatives`. Out of scope for this workstream — separate consolidate-or-retire decision later.

**Decision (2026-04-26):**

1. **Single scheme** in `catalyst_workflow_schemes` with `issue_type='Business Request'`, `is_default=true`. The label "Business Request" reflects the dominant initiative type on the board today.
2. **Universal application** — the same 13 statuses + 21 transitions apply to every initiative type on `ph_initiatives`, not only `business_request`. Other types (enhancement, project, etc.) follow the same lifecycle.
3. **Drives `/producthub/kanban` only** via `ph_initiatives.status`. Type-based filtering is orthogonal and stays as a board chip filter.
4. **Legacy `business_requests` table is OUT OF SCOPE.** No changes to Demand Kanban, `process_step`, or `demand_process_steps` table in this workstream. Section 9 retains a documented branch in case we later want to retire it.

---

## 1. The 13 statuses + transitions (from the diagram)

### Statuses

| Position | Slug | Display | Category | Initial | Final |
|----------|------|---------|----------|---------|-------|
| 1 | `new` | NEW | todo | ✅ | |
| 2 | `portfolio_review` | PORTFOLIO REVIEW | todo | | |
| 3 | `technical_validation` | TECHNICAL VALIDATION | todo | | |
| 4 | `estimate` | ESTIMATE | todo | | |
| 5 | `demand_approved` | DEMAND APPROVED | todo | | |
| 6 | `analysis` | ANALYSIS | in_progress | | |
| 7 | `ready_for_development` | READY FOR DEVELOPMENT | todo | | |
| 8 | `under_implementation` | UNDER IMPLEMENTATION | in_progress | | |
| 9 | `implementation_review` | IMPLEMENTATION REVIEW | in_progress | | |
| 10 | `on_hold` | ON HOLD | todo | | |
| 11 | `in_support` | IN SUPPORT | done | | |
| 12 | `done` | DONE | done | | ✅ |
| 13 | `canceled` | CANCELED | done | | ✅ |

Categories follow the StatusLozenge 3-colour guardrail: GREY (todo) / BLUE (in_progress) / GREEN (done). Pre-cleared with §5.

### Transitions (21 edges — confirmed 2026-04-26; PR → CANCELED is a forward escape, not double-counted)

User decision: keep escape-hatch ambiguous edges (to ON HOLD / CANCELED), drop forward-skip and back-routes to earlier statuses. No backward routing except the ON HOLD resume path and the rework-from-TV path.

**Forward edges (16):**
```
NEW → PORTFOLIO REVIEW
PORTFOLIO REVIEW → TECHNICAL VALIDATION
PORTFOLIO REVIEW → CANCELED
TECHNICAL VALIDATION → ESTIMATE
TECHNICAL VALIDATION → ON HOLD
TECHNICAL VALIDATION → CANCELED
ESTIMATE → DEMAND APPROVED
DEMAND APPROVED → ANALYSIS
DEMAND APPROVED → READY FOR DEVELOPMENT
ANALYSIS → READY FOR DEVELOPMENT
READY FOR DEVELOPMENT → UNDER IMPLEMENTATION
UNDER IMPLEMENTATION → IMPLEMENTATION REVIEW
UNDER IMPLEMENTATION → ON HOLD
IMPLEMENTATION REVIEW → IN SUPPORT
IN SUPPORT → DONE
PORTFOLIO REVIEW → ON HOLD
```

**Backward / resume edges (2):**
```
TECHNICAL VALIDATION → PORTFOLIO REVIEW    (rework requested)
ON HOLD → TECHNICAL VALIDATION             (resume from hold)
```

**Escape hatches to terminal (4):**
```
NEW → CANCELED
ON HOLD → CANCELED
IMPLEMENTATION REVIEW → CANCELED
(PORTFOLIO REVIEW → CANCELED already in forward list)
```

**Dropped (per user 2026-04-26):**
- ~~ESTIMATE → PORTFOLIO REVIEW~~ (no backward route to PR from estimate)
- ~~DEMAND APPROVED → TECHNICAL VALIDATION~~ (approval is one-way; rework happens before approval)
- ~~PORTFOLIO REVIEW → ESTIMATE~~ (no skip past TECHNICAL VALIDATION)

---

## 2. Phased delivery

Eight phases, designed to be shippable in sequence. Each phase is its own G7→G9 cycle (Forge gate language).

### Phase 1 — Schema seed (1 migration file, 1 scheme)

**Files touched:**
- `supabase/migrations/<ts>_business_request_workflow_seed.sql` (new)

**Work:**
- Insert one row into `catalyst_workflow_schemes` with `issue_type='Business Request'`, `is_default=true`, `is_active=true`.
- Insert 13 rows into `catalyst_workflow_statuses` (table in §1).
- Insert 22 rows into `catalyst_workflow_transitions` (list in §1).
- All wrapped in a single `DO $$ ... END $$;` block with `id` capture variables for FK references.

**Acceptance:** Manual seed verification via Supabase SQL editor — `SELECT count(*) FROM catalyst_workflow_statuses WHERE scheme_id = (SELECT id FROM catalyst_workflow_schemes WHERE issue_type='Business Request')` returns `13`. Transitions count returns `22`.

### Phase 2 — Admin entry visible

**Files touched:**
- None — `WorkflowAdminPage.tsx` already lists `Business Request` as a tab. Once Phase 1's seed lands, the tab loads the editor automatically via `useCatalystWorkflow('Business Request')`.

**Acceptance:** Open `/admin/workflows` → click Business Request tab → Editor view shows 13 statuses, Diagram view shows 24 transitions.

**Risk:** if the existing tab uses a different `issue_type` literal (e.g. `'business_request'` vs `'Business Request'`), Phase 1 needs to match it. Verify in the WorkflowAdminPage before writing the migration.

### Phase 3 — Status sync to `ph_initiatives`

**Files touched:**
- `src/components/kanban/adapters/productHubBoardAdapter.tsx` (rewrite column generation)
- `src/hooks/useMDTBacklog.ts` (no change to fetch, but ensure status field is consumed correctly)
- `supabase/migrations/<ts>_normalize_ph_initiatives_status.sql` (data hygiene only — coerce existing values to canonical slugs)

**Work:**
- Replace the hardcoded `PRODUCTHUB_BOARD_COLUMNS` array with a hook that reads `useCatalystWorkflow('Business Request')` and groups statuses into board columns. Columns may collapse multiple statuses (e.g. ESTIMATE + DEMAND APPROVED → one "Approval" column) via a `column_group` extension on `catalyst_workflow_statuses` or a fixed adapter map.
- Audit existing `ph_initiatives.status` values against the 13 canonical slugs. Any orphan rows get coerced via the data-hygiene migration.
- Drag-drop mutation continues to write `ph_initiatives.status` (text) — but only valid slugs are allowed because the dropdown source is now the workflow.
- All initiative types (business_request, enhancement, project, etc.) use the same column layout — type is shown as a card-level icon/lozenge, not as a separate board.

**Acceptance:**
- `/producthub/kanban` renders columns dynamically from the workflow scheme.
- Drag a card from PORTFOLIO REVIEW → TECHNICAL VALIDATION; reload; card stays in TECHNICAL VALIDATION.
- Edit a status name in `/admin/workflows` → reload `/producthub/kanban` → column header updates.
- A non-business_request initiative (e.g. type=enhancement) renders on the same board with the same column structure.

### Phase 4 — Atlaskit migration of the Kanban surface

This is the visual parity work. Surgical, one component at a time.

**Order of attack** (each is a separate Claude Code task brief, isolated scope):

| # | Component | File | Replacement |
|---|-----------|------|-------------|
| 4.1 | Status lozenge | `WorkItemCard.tsx` | `@atlaskit/lozenge` (already installed) |
| 4.2 | Department + quarter badges | `WorkItemCard.tsx` | `@atlaskit/lozenge` appearance variants |
| 4.3 | Card surface tokens | `WorkItemCard.tsx` | replace inline `style={{}}` with `xcss` + `token()` calls |
| 4.4 | Search input | `KanbanToolbar.tsx` | `@atlaskit/textfield` |
| 4.5 | Toolbar buttons | `KanbanToolbar.tsx` | `@atlaskit/button` |
| 4.6 | Overflow menu | `WorkItemOverflowMenu.tsx` | `@atlaskit/dropdown-menu` |
| 4.7 | Empty state | `PragmaticBoard.tsx` | `@atlaskit/empty-state` |
| 4.8 | Lucide → Atlaskit icons | various | `@atlaskit/icon` for Flag/Edit/More/Inbox |
| 4.9 | Column header | `PragmaticBoard.tsx` | tokenized `Inline` + `Lozenge` count badge |

**Pre-flight (per CLAUDE.md §1 adoption protocol):**
- Confirm every `@atlaskit/*` package used is in `vite.config.ts` `optimizeDeps.include` — currently missing `@atlaskit/pragmatic-drag-and-drop-react-accessibility` and `@atlaskit/tag` per the audit.
- Add to `package.json` if not installed.

**Card layout — Jira parity reference (synthesized from your context):**

```
┌──────────────────────────────────────────┐
│ summary text, up to 3 lines            🚩│  ← title + flag icon (right-aligned, hover-revealed)
│                                          │
│ [DEPARTMENT]  [Q3-2026]                  │  ← lozenges row (Atlaskit Lozenge)
│                                          │
│ 🟦 PROD-225  ▰▰▰  👤                     │  ← icon + key (mono) + priority bars + assignee avatar
└──────────────────────────────────────────┘
```

This matches what `WorkItemCard.tsx` already renders — the migration is **token + primitive substitution, not a redesign**.

**Acceptance per substep:**
- DevTools: every replaced primitive renders `@atlaskit/*` class names.
- No new `style={{}}` props introduced.
- Light/dark mode flips correctly via `setGlobalTheme`.
- StatusLozenge guardrail (CLAUDE.md §5) still holds — only 3 colours.

### Phase 5 — Wiring audit (jira-compare gate)

**Files touched:** none (audit pass).

**Work:**
- Run the `jira-compare` skill against the rendered ProductHub Kanban with the Jira board screenshot you'd provide.
- Probe → diff → patch → re-probe loop on layout deviations only. Spec compliance > pixel parity.
- Output: a deviation register marking which deltas are intentional (Catalyst surface chrome) vs unintentional (regressions).

**Acceptance:** zero P0 deviations in the register.

### Phase 6 — Status sync round-trip test

**Work:** verify the admin → kanban → DB → kanban round trip:

1. In `/admin/workflows` (Business Request tab), rename `IN SUPPORT` to `IN PRODUCTION SUPPORT`.
2. In `/producthub/kanban`, the column header reads `IN PRODUCTION SUPPORT` after a refresh (no code change required).
3. Drag a card to that column.
4. Verify `ph_initiatives.status = 'in_support'` (slug stays canonical even when the display name changes).
5. Use the visual diagram editor in `/admin/workflows` to delete the `IN SUPPORT → DONE` transition.
6. On the kanban, the right-click "Move to DONE" action no longer appears for cards in IN SUPPORT.

**Acceptance:** all 6 steps pass without code changes between them.

### Phase 7 — Accessibility + design critique

**Work:** invoke `/design:accessibility-review` and `/design:design-critique` against the migrated kanban.

**Targets (CLAUDE.md §14 quality goals):**
- WCAG AA = 100%
- Token-only CSS = 100%
- Dead CTAs = 0
- Dead wiring = 0
- UI/UX score ≥ 9.8

### Phase 8 — Ship + post-ship monitoring

**Work:** GitMerge to main, deploy via `deploy-to-production` skill, smoke-test on prod.

---

## 3. Files-to-touch master list

| File | Phase | Change |
|------|-------|--------|
| `supabase/migrations/<ts>_business_request_workflow_seed.sql` | 1 | NEW |
| `supabase/migrations/<ts>_normalize_ph_initiatives_status.sql` | 3 | NEW (data hygiene) |
| `src/pages/admin/workflows/WorkflowAdminPage.tsx` | 2 | Verify only — likely no edit |
| `src/hooks/useCatalystWorkflow.ts` | — | No edit |
| `src/components/kanban/adapters/productHubBoardAdapter.tsx` | 3 | Replace hardcoded columns with workflow-driven hook |
| `src/components/kanban/WorkItemCard.tsx` | 4.1–4.3 | Atlaskit Lozenge/xcss/tokens |
| `src/components/kanban/toolbar/KanbanToolbar.tsx` | 4.4, 4.5 | Atlaskit Textfield/Button |
| `src/components/kanban/overflow-menu/WorkItemOverflowMenu.tsx` | 4.6 | Atlaskit Dropdown |
| `src/components/kanban/PragmaticBoard.tsx` | 4.7, 4.9 | Empty state + tokenized headers |
| `src/components/kanban/kanban-tokens.ts` | 4.3 | Bridge to `@atlaskit/tokens` |
| `vite.config.ts` | 4 (pre-flight) | Add 2 missing packages to `optimizeDeps.include` |
| `package.json` | 4 (pre-flight) | Add 2 missing `@atlaskit/*` deps |

**Out of scope (do not touch):**
- `business_requests` table or any of its 10+ consumer files (Option 1 path).
- `demand_process_steps` table.
- `src/modules/kanban/pages/CatalystDemandKanban.tsx`.
- Story workflow.
- Any other hub.

---

## 4. Schema migration sketch — Phase 1

```sql
-- 20260427000000_business_request_workflow_seed.sql

DO $$
DECLARE
  scheme_uuid UUID;
  s_new UUID; s_pf UUID; s_tv UUID; s_est UUID; s_da UUID; s_an UUID;
  s_rfd UUID; s_ui UUID; s_ir UUID; s_oh UUID; s_is UUID; s_done UUID; s_can UUID;
BEGIN
  -- 1. Scheme
  INSERT INTO catalyst_workflow_schemes (name, issue_type, is_default, is_active)
  VALUES ('Business Request Workflow', 'Business Request', true, true)
  RETURNING id INTO scheme_uuid;

  -- 2. Statuses (insert + capture id per status for transitions below)
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (scheme_uuid, 'New', 'new', 'todo', '#DFE1E6', 1, true, false) RETURNING id INTO s_new;
  -- ... repeat for all 13, capturing into s_pf, s_tv, ... s_can ...

  -- 3. Transitions
  INSERT INTO catalyst_workflow_transitions (scheme_id, name, from_status_id, to_status_id, is_global, sort_order) VALUES
    (scheme_uuid, 'Move to portfolio review', s_new, s_pf, false, 1),
    (scheme_uuid, 'Cancel from new', s_new, s_can, false, 2),
    -- ... 22 more
    ;
END $$;
```

Full migration will be written in Phase 1 once Finding B is resolved.

---

## 5. Risks + mitigations

| Risk | Phase | Mitigation |
|------|-------|------------|
| `issue_type` string mismatch (`Business Request` vs `business_request`) breaks tab loading | 1, 2 | grep `WorkflowAdminPage.tsx` for the exact literal before writing the seed |
| `ph_initiatives.status` has values not in the 13 canonical slugs | 3 | Phase 3 migration is data-hygiene only — explicit mapping per orphan |
| Drag-drop on Atlaskit-migrated cards regresses on re-render | 4 | Pragmatic DnD already in place — keep `draggable()` registration on the same element identity through migration |
| `optimizeDeps` cold-start stall on first kanban load | 4 (pre-flight) | Add missing packages to vite config BEFORE any phase-4 commit |
| Light/dark token coverage gap on new Atlaskit primitives | 4 | Audit `customColors` mapping in `AdsThemeProvider` for Lozenge/Button/Textfield surfaces |
| Status renames in admin break the kanban (slug-vs-name confusion) | 6 | Slug is the source of truth in DB; display name is read at render time |

---

## 6. ADS / Atlaskit coverage gates (CLAUDE.md §1 adoption protocol)

For every package added in Phase 4 pre-flight:

1. ✅ Add `"@atlaskit/<pkg>": "^<version>"` to `package.json`.
2. ✅ Add `'@atlaskit/<pkg>'` to `vite.config.ts` `optimizeDeps.include`.
3. ✅ Import canonically in target file.
4. ✅ Verify first `npm run dev` boot < 5s (no cold-optimize stall).

Currently audited as missing on `vite.config.ts`:
- `@atlaskit/pragmatic-drag-and-drop-react-accessibility`
- `@atlaskit/tag`

---

## 7. Quality gates (Forge G0–G12)

| Gate | Owner | When |
|------|-------|------|
| G3 (Schema) | Forge | After Phase 1 migration written |
| G4 (HTML demo) | Forge | Before Phase 4 starts — show migrated card mock |
| G5 (Compare) | Forge + jira-compare skill | Phase 5 |
| G6 (Critique) | design:design-critique | Phase 7 |
| G7 (Task brief) | Forge → Claude Code | Each Phase-4 substep |
| G8 (Build) | Claude Code | Phase 4 substeps |
| G9 (QA score) | Forge | After each Phase-4 substep |
| G10 (Wiring audit) | Forge + jira-compare | Phase 5 |
| G11 (Polish) | Claude Code | Phase 7 |
| G12 (Ship) | Forge | Phase 8 |

---

## 8. ECLIPSE (dark mode) impact

Per CLAUDE.md §3 / §11 / §12:

- ProductHub is currently in MID-FIX state for ECLIPSE (Hub 3 — HSL drift active). The kanban audit found inline `style={{}}` props with hardcoded RGB — these are the Hub-3 violation pattern.
- **Phase 4 Atlaskit migration resolves the ECLIPSE dark-mode regression as a side effect**, because `xcss` + `token()` use ADS dark tokens automatically via `setGlobalTheme({colorMode:'dark'})`.
- **No new `.dark .bg-white` blocks may be added** to `index.css`. (L32, L35.)
- After every Phase-4 substep, verify computed bg in DevTools = `rgb(26, 23, 20)` for cards in dark mode. (L37.)

---

## 9. Out-of-scope branch — retiring the legacy `business_requests` table

The legacy `business_requests` table and its Demand Kanban are **not** touched by this workstream. If we later decide to retire the duplication, here's the shape that work would take:

- Audit active `business_requests` rows; any not already mirrored as `ph_initiatives` get migrated with `initiative_type='business_request'`.
- Map the 10 `process_step` values to the 13 canonical slugs (data audit + manual mapping for orphans).
- Update or retire 10+ consumers (drawer, table view, audit log, Demand Kanban itself).
- Preserve audit history via a one-time copy from `business_request_audit_logs` into a unified `ph_initiatives_audit_logs` (or keep both pointers during a transition window).
- **Effort: ~2x Phase 1–4 combined** because of consumer count and audit-log preservation. Track as a separate plan.

This is parked deliberately. The current workstream's success criteria do not depend on it.

---

## 10. Approvals locked in (2026-04-26, post-reassessment)

1. ✅ **Finding A** → Generic `catalyst_workflow_*` tables, no per-type fork.
2. ✅ **Finding B (revised)** → Single scheme on `ph_initiatives`. The legacy `business_requests` table and Demand Kanban are out of scope.
3. ✅ **Scheme label** → `issue_type='Business Request'` (matches the dominant initiative type and the existing tab placeholder in `WorkflowAdminPage.tsx`).
4. ✅ **Type scope** → Universal. Same 13-status workflow applies to all initiative types (business_request, enhancement, project, etc.).
5. ✅ **Transitions** → 22 edges (Section 1). Three back-routes dropped (ESTIMATE→PR, DA→TV, PR→ESTIMATE).

**Net effect of the reassessment:** Phase 1 writes ONE scheme (was two). Phase 3 touches one adapter (was two). Demand Kanban migration deferred to a separate plan. ECLIPSE Hub-3 dark-mode regression still resolves as a side effect of Phase 4 Atlaskit migration.

Phase 1 ready to start. Migration is a single transactional SQL file: 1 scheme + 13 statuses + 21 transitions.
