# A7 — QA/Screenshot Validator Report
**Feature:** CAT-SPRINTS-NATIVE-20260702-002 — native sprint module redesign
**Agent:** QA/Screenshot Validator · **Date:** 2026-07-02
**Inputs read:** `features/CAT-SPRINTS-NATIVE-20260702-002/13_COUNCIL_VERDICT.md`, `docs/ways-of-working/CATALYST_UI_UX_ACCEPTANCE.md`

Principles enforced throughout:
- Screenshots prove appearance only. Function is proven by DOM probes (Chrome MCP on `localhost:8080`) and DB probes (SQL against **staging** `cyijbdeuehohvhnsywig`).
- Dark mode = system dark + hard reload, never runtime toggle (CATALYST_UI_UX_ACCEPTANCE §Dark Mode).
- Zero-assumption: an empty state that renders a dash/nothing PASSES; a fabricated default FAILS.
- Vitest is broken on Node 20 — DOM/DB probes replace unit tests (house rule).

---

## 1. SCREENSHOT CHECKLIST (paste into 10_SCREENSHOT_CHECKLIST.md)

Naming convention per acceptance doc: `01_reference / 02_implementation / 03_dark_mode / 04_empty_state / 05_loading_state / 06_error_state / 07_regression_adjacent`. All shots at the same viewport as the reference. Every shot passes the visual-rejection scan (no hex/Tailwind colors, no hand-rolled UI, 4/8/16/24/32 spacing, sentence case).

### Slice S1.1/S1.2 — Sprint list page (JiraTable)
- [ ] `01_reference.png` — Jira BAU releases list (columns, lozenges, red overdue dates, count banner, contextual quick-action) — re-capture if stale
- [ ] `02_implementation.png` — new list: Sprint (name + 1W/2W lozenge) · Status pill · Progress (fraction + segmented bar) · Start date · Sprint end · Release chip · Owner avatar · ⋯ kebab
- [ ] `02b_groupby_month.png` — group-by Month ("January 2026" headers, newest first)
- [ ] `02c_groupby_status.png` — group-by Status
- [ ] `02d_status_filter.png` — multi-select status filter open (All/Planning/Active/Awaiting approval/Completed/Archived), default non-archived
- [ ] `02e_overdue_row.png` — a row with Sprint end in the past rendering in danger text (`--ds-text-danger`, not raw red)
- [ ] `02f_quick_action.png` — contextual "Start sprint"/"Complete sprint" button on an eligible row
- [ ] `03_dark_mode.png` — reload-into-dark; check pills/lozenges/segmented bar for white glare
- [ ] `04_empty_state.png` — project with zero sprints (post-purge state is real: 26 dead sprints soft-deleted)
- [ ] `05_loading_state.png` — skeleton rows
- [ ] `06_error_state.png` — query failure (block network to Supabase via Chrome MCP)
- [ ] `07_regression_adjacent.png` — Releases list page (still on ReleasesTable, untouched)

### Slice S1.3 — Create sprint modal, AUTO mode
- [ ] `01_reference.png` — Jira create-release modal (Driver avatar picker pattern)
- [ ] `02_implementation.png` — auto mode: read-only computed name `BAU-Sprint 1.1 - 08 Jan 26`, 1W/2W length picker, start date, computed end date, DoD section seeded, "Link to release" select, creator avatar
- [ ] `02b_recompute.png` — after changing start date or length: name and end date recomputed (capture before/after pair)
- [ ] `03_dark_mode.png`
- [ ] `04_empty_state.png` — no release available to link → select renders empty/none, no fabricated default
- [ ] `05_loading_state.png` — submit in-flight (button spinner state)
- [ ] `06_error_state.png` — duplicate `(project_id, name)` or insert failure surfaced inline
- [ ] `07_regression_adjacent.png` — create-release modal unchanged

### Slice S1.3 — Create sprint modal, CUSTOM mode
- [ ] `02_implementation.png` — name field editable, `name_mode=custom` toggle visible
- [ ] `02b_switch_back.png` — toggling back to Auto recomputes the name
- [ ] `03_dark_mode.png`
- [ ] `06_error_state.png` — custom-name collision → trigger dedupe `-2` (or inline error, per final UX)
- [ ] `07_regression_adjacent.png` — modal footer/actions vs ADS modal-dialog reference

### Slice S1.3 — 1W vs 2W states
- [ ] `02_implementation_1w.png` — 1W selected: end = start + 4 days (Thursday), ribbon/lozenge "1W"
- [ ] `02_implementation_2w.png` — 2W selected: end = start + 11 days, same name structure (length NOT in the name), lozenge "2W"
- [ ] `02b_list_lozenges.png` — list page rendering both 1W and 2W lozenges side by side
- [ ] `03_dark_mode.png` — both lozenges
- [ ] `07_regression_adjacent.png` — a 2W sprint spanning a month boundary still named from its START month

### Slice S1.4 / detail — Sprint detail rail (side panel)
- [ ] `01_reference.png` — Jira version detail side panel
- [ ] `02_implementation.png` — rail with status, dates, length lozenge, release chip (SprintLinker chip UX), owner avatar
- [ ] `02b_release_chip_edit.png` — chip in edit state (retarget/change linked release)
- [ ] `03_dark_mode.png`
- [ ] `04_empty_state.png` — no linked release → no chip, no placeholder lie
- [ ] `05_loading_state.png`
- [ ] `06_error_state.png` — sprint slug not found → error/404 surface
- [ ] `07_regression_adjacent.png` — release detail side panel unchanged

### Slice S2.2/S2.3 — Approvals card states
- [ ] `02_pending.png` — avatars + Pending lozenge + relative time
- [ ] `02b_partial.png` — policy=all, 1 of 3 approved (mixed lozenges)
- [ ] `02c_approved.png` — policy satisfied → sprint completed
- [ ] `02d_rejected.png` — rejection with reason → sprint back to active, rejection note visible
- [ ] `02e_zero_approvers.png` — confirm dialog for instant completion
- [ ] `02f_quorum.png` — policy=quorum 4 approvers, 2/4 (tie keeps waiting)
- [ ] `03_dark_mode.png` — lozenge trio in dark
- [ ] `04_empty_state.png` — no approvers configured → card shows add-approver affordance only
- [ ] `05_loading_state.png` — decision submit in-flight
- [ ] `06_error_state.png` — decision write failure
- [ ] `07_regression_adjacent.png` — ApproversCard usage on its original (release) surface unchanged

### Slice S2.1 — Definition of Done editor
- [ ] `02_implementation.png` — one row per work-item type present in sprint, per-type status select from the existing per-type catalog (defect shows UAT READY etc.), default "Done" seeded
- [ ] `02b_edited.png` — a type's DoD changed to a non-default status
- [ ] `02c_satisfied_banner.png` — all types satisfied → awaiting_approval transition surfaced (banner/toast + status pill change)
- [ ] `03_dark_mode.png`
- [ ] `04_empty_state.png` — sprint with zero items → editor empty (no phantom type rows)
- [ ] `05_loading_state.png`
- [ ] `06_error_state.png` — save failure
- [ ] `07_regression_adjacent.png` — work-items section filters beside it unchanged

### Slice S3.x — Sprint report sections (GATED — screenshot only after 3 data proofs pass)
- [ ] `02_summary.png` — cached AI summary in CatyInsightCard (trigger = CatyPulseIcon, magenta, never muted)
- [ ] `02b_approval_trail.png` — full decision timeline (who, decision, decided_at)
- [ ] `02c_scope_change.png` — "Added after start" table; last-day adds with warning lozenge
- [ ] `02d_dependencies.png` — open blocker deps section
- [ ] `02e_time_in_status.png` — per item/status/assignee-at-the-time, longest-dwell first
- [ ] `02f_efficiency.png` — 0–100 score + "vs last sprint ±n" chip
- [ ] `03_dark_mode.png` — full report
- [ ] `04_empty_state.png` — CRITICAL zero-assumption shot: transitions absent → sections render NOTHING (no zeroed metrics, no fake 100%)
- [ ] `05_loading_state.png` — summary generation in-flight
- [ ] `06_error_state.png` — edge-fn failure with inline retry
- [ ] `07_regression_adjacent.png` — release report/summarize surface unchanged

### Slice S3.4 — Sprint health popover
- [ ] `02_disabled.png` — CatyPulseIcon button disabled; tooltip listing exactly what's missing (transitions/dates/items)
- [ ] `02b_enabled.png` — enabled state beside More actions
- [ ] `02c_popover_ontrack.png` — ≥80 On track band
- [ ] `02d_popover_atrisk.png` — 50–79 At risk + "what's pending" list (approver names, items not at DoD, blockers)
- [ ] `02e_popover_offtrack.png` — <50 Off track
- [ ] `03_dark_mode.png` — popover + bands
- [ ] `04_empty_state.png` — n/a beyond disabled state (disabled IS the empty state) — record as such
- [ ] `06_error_state.png` — score computation failure → popover error, not 0%
- [ ] `07_regression_adjacent.png` — More actions kebab unchanged next to the new button

---

## 2. FUNCTIONAL PROBES (DOM via Chrome MCP on localhost:8080 · SQL via staging cyijbdeuehohvhnsywig)

> RLS caveat from council probe evidence: anon key returns 0 rows on `ph_issues`. All SQL probes below that touch `ph_issues` MUST run authenticated/service-role, or via the app session in Chrome MCP network tab.

### P-0 (Phase 0 foundations)
| # | Proves | Probe |
|---|---|---|
| F0.1 | Slug codified + hook fixed | `SELECT column_name FROM information_schema.columns WHERE table_name='ph_jira_sprints' AND column_name IN ('slug','deleted_at','created_by','name_mode','length_weeks','approval_policy','end_date');` → all present. DOM: navigate `/.../sprints/<slug>` → detail renders, no PGRST error in network tab (previously `.is('deleted_at',null)` 400-ed). |
| F0.2 | FK is sole membership path | `SELECT count(*) FROM ph_issues WHERE sprint_id IS NOT NULL;` vs pre-backfill JSONB/name counts (service-role). DOM: rename a sprint → work-items section membership count unchanged (re-read DOM count before/after). |
| F0.3 | Jira sync neutered for native sprints | Trigger a sync (or inspect sync fn), then `SELECT sprint_name FROM ph_issues WHERE sprint_id=<native>` — unchanged. |
| F0.4 | Status vocabulary migrated | `SELECT status, count(*) FROM ph_jira_sprints GROUP BY 1;` → only new vocabulary; `in_progress`/`released` = 0. CHECK constraint present in `pg_constraint`. |
| F0.5 | Dead-sprint purge is soft | `SELECT count(*) FROM ph_jira_sprints WHERE deleted_at IS NOT NULL;` = 26 (audited count); list DOM shows 0 of them. |
| F0.6 | Native transition write path (new S0.1c) | In app, change a work-item status → `SELECT * FROM work_item_transitions WHERE jira_changelog_id IS NULL ORDER BY created_at DESC LIMIT 1;` → 1 new row (was 0). **This unblocks all Phase-3 gates.** |

### P-1 (List + Create)
| # | Proves | Probe |
|---|---|---|
| F1.1 | Auto-name correct | Create sprint, start Sun 04 Jan 26, 1W → DOM name field reads `BAU-Sprint 1.1 - 08 Jan 26`; then `SELECT name, slug, name_mode, length_weeks, end_date FROM ph_jira_sprints ORDER BY created_at DESC LIMIT 1;` → matches; slug slugified; `sprint_autoname()` DB fn agrees with client (insert a mismatching name via SQL → rejected). |
| F1.2 | Recompute on change | In modal, change length 1W→2W → DOM end date = start+11d, name unchanged structure. |
| F1.3 | Custom rename FK-safe | Rename custom sprint → `SELECT count(*) FROM ph_issues WHERE sprint_id='<id>';` before = after; detail work-items list identical. |
| F1.4 | Uniqueness + dedupe | Insert duplicate custom name same project → row saved with `-2` suffix (or inline error). `(project_id,name)` unique index exists. |
| F1.5 | Slug frozen | Rename → `SELECT slug FROM ph_jira_sprints WHERE id='<id>';` unchanged; old URL still resolves. |
| F1.6 | Release link | Link release in modal → `SELECT * FROM ph_release_sprints WHERE sprint_id='<id>';` → 1 row with linked_by; list Release column shows name + release_date sourced from Release Hub (cross-check `ph_releases.release_date`). |
| F1.7 | Group-by/filter honest | Month headers match `date_trunc('month', start_date)` counts from SQL; Archived filter off by default → archived row absent from DOM. |

### P-2 (Lifecycle)
| # | Proves | Probe |
|---|---|---|
| F2.1 | DoD seeded per type | Create sprint with items of 2 types → `SELECT work_item_type, done_status FROM ph_sprint_dod WHERE sprint_id='<id>';` → 2 rows, default 'Done'. |
| F2.2 | DoD satisfied → awaiting_approval (never completed) | Move all items to/beyond DoD statuses → `SELECT status FROM ph_jira_sprints WHERE id='<id>';` = `awaiting_approval`; `vw_sprint_dod_state` all-satisfied. **FAIL if status = completed.** |
| F2.3 | Approval decision recorded | Approve in UI → `SELECT status, decided_at, decision_note FROM ph_sprint_approvers WHERE sprint_id='<id>';` → decided_at NOT NULL; CHECK constraint on status exists. |
| F2.4 | Policy=all + rejection reopens | 1 of 3 rejects → sprint status back to `active`, rejection reason persisted; other approvers' rows untouched. |
| F2.5 | Zero approvers → confirm dialog | DOM: complete with 0 approvers → dialog appears; on confirm sprint = completed; no silent completion path. |
| F2.6 | Quorum math | 4 approvers, 2 approve → still `awaiting_approval`; 3rd approve → `completed`. |
| F2.7 | Start-sprint guard | "Start sprint" with no items → warning surfaced (DOM), status stays `planning` unless confirmed. |

### P-3 (Insights — run only after F0.6 + backfill validation pass)
| # | Proves | Probe |
|---|---|---|
| F3.1 | Summary cache hit | Click Summarize → network tab shows edge-fn call; `SELECT data_hash, created_at FROM sprint_summary_cache WHERE sprint_id='<id>';` → row. Click again with no data change → **network probe: zero new edge-fn requests**, same data_hash. Change one item status → third click fires edge-fn, new data_hash row. |
| F3.2 | Scope-change instrumentation | Add item via AddWorkItemsModal → `SELECT * FROM work_item_changelogs WHERE field_name='sprint' ORDER BY created_at DESC LIMIT 1;` → new row (staging baseline was 0 — forward-only). Report "Added after start" shows it. |
| F3.3 | Health gating honest | Sprint missing dates → button disabled + tooltip lists "dates"; set dates + ≥1 item + transitions → enabled. Score recomputes: introduce an open blocker dep → score drops, blocker named in popover. |
| F3.4 | Efficiency ratios | Completed 1W and 2W sprints with known fixtures → recompute CR/FE/SS/TA by hand from `work_item_transitions` SQL, compare to displayed 0–100 (tolerance ±1). |
| F3.5 | Zero-assumption gate | Sprint with 0 transition rows → report sections render nothing; `document.querySelectorAll` for metric elements returns 0; no "0%"/"100%" fabrications. |

---

## 3. REGRESSION SUITE — blast-radius surfaces (run full suite after Phase 0 AND after Phase 2)

| # | Surface | Why at risk | One probe |
|---|---|---|---|
| R1 | Work-item detail "Sprint/Iteration" field | Read path repointed from `sprint_release` JSONB to FK (S0.2) | Open a work item known to be in a sprint → field shows the sprint name; then rename the sprint → field updates (FK) instead of blanking (name-match). SQL cross-check `sprint_id` join. |
| R2 | Release list + release detail | Sprints leave shared `SPRINT_CONFIG`/ReleasesTable; releases must keep them | Load a release hub list + one release detail → columns, statuses (planning/in_progress/released/archived), progress bar identical to pre-change screenshot; no sprint vocabulary leaks into releases. |
| R3 | vw_sprint_jira_progress consumers (progress view) | View repointed to FK in S0.2 | `SELECT * FROM vw_sprint_jira_progress LIMIT 5;` returns rows; progress fraction on list matches a hand SQL count for one sprint. |
| R4 | Kanban board | Status vocabulary migration + (deferred) status injection risk | Load a project board → columns render, cards draggable, no unknown-status column/console error after `in_progress→active` mapping. |
| R5 | Filters (work-item filters incl. sprint filter) | Sprint name/FK source change | Apply a sprint filter → result count equals `SELECT count(*) FROM ph_issues WHERE sprint_id='<id>'` (service-role). |
| R6 | Jira sync run | sprint_name writer neutered only for native sprints | After a sync: Jira-imported items unchanged; native sprint memberships intact (F0.3 re-run). |
| R7 | ApproversCard original surface + summarize-release edge fn | Both reused/extended | Release approvals card renders and a release summary still generates (network 200). |
| R8 | Sprint slug routes / UuidToSlugRedirect | routes.ts builder added | Old UUID sprint URL → redirects to slug URL outside CatalystShell; slug URL direct-loads. |

Cadence: R1–R8 after Phase 0 (foundations are the highest blast-radius). R1, R2, R4, R7 again after Phase 2 (lifecycle touches status + approvals). Any regression → RED FLAG protocol, stop, no patch-over.

---

## 4. VALIDATION COMMANDS (every slice, before commit)

```bash
# TypeScript — root config is a no-op; MUST use app project. Baseline ~157 errors: compare counts, fail on increase.
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"   # record N; N > baseline → stop

# ADS color ratchet (baseline design-governance/color-baseline.json) — must pass
npm run lint:colors:gate

# Full design-governance ratchet (Tailwind color utils, font-size, spacing grid) — must pass
npm run audit:ads:gate

# If a slice REDUCES a count, ratchet baselines down and commit them:
# node scripts/ads-color-gate.cjs --update && node scripts/ads-audit-gate.cjs --update
```

- **Vitest is broken on Node 20** (rolldown styleText) — do NOT attempt `npm run test`; the DOM/DB probes in §2 are the functional evidence per house rules.
- Pre-touch color audit (CLAUDE.md grep) on every file before editing styled code.

---

## 5. ENVIRONMENT GOTCHAS

1. **Dev server: `localhost:8080`** — all Chrome MCP probes target this; port-lock per preflight convention.
2. **Dark mode = reload-into-dark.** System dark mode ON → hard reload → screenshot. Runtime toggle gives false white-glare results (emotion/CSS-in-JS).
3. **DB target drift:** the app points at staging `cyijbdeuehohvhnsywig`; the session Supabase MCP may point at prod `lmqwtldpfacrrlvdnmld` where **`ph_jira_sprints` does not exist**. Verify project ref before EVERY SQL probe (`get_project_url`) or probes silently validate the wrong database.
4. **RLS blinds anon probes:** `ph_issues` returns count 0 to the anon key. Linkage/membership SQL needs service-role or an authenticated session; otherwise treat counts as unreliable.
5. **Slug column already live on staging but in no migration** — schema-presence probes must not assume checked-in migrations describe reality; probe `information_schema` directly.
6. **Chrome extension can disconnect mid-session** (it killed the original Jira DOM probe) — re-run `list_connected_browsers` before each probe block; screenshots without a live DOM read are not acceptance evidence.
7. **Analytics gate status (from council probes):** leg 1 partial (2,085 backfilled transition rows), leg 2 FAILED (0 native rows), sprint changelog history absent (0 `field_name='sprint'` rows). Phase-3 screenshots/probes are BLOCKED until F0.6 passes and backfill is validated for one project.
8. Worktree trap: if this feature runs in a worktree, all file paths in probes/evidence must use the worktree prefix or edits land on the main checkout.

---

## Acceptance gate summary
A slice is DONE only when: its screenshot set (§1) is captured and passes the visual-rejection scan, its functional probes (§2) pass with raw output pasted into `06_VALIDATION_EVIDENCE.md`, the relevant regression probes (§3) pass, and all three commands in §4 are clean/at-baseline. No exceptions; no verbal "close enough".
