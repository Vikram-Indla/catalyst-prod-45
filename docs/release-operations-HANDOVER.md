# Release Operations Rebuild — HANDOVER

**Branch:** `release-operations-rebuild-01` · **HEAD:** `3999f96fa` (pushed to origin)
**PR:** https://github.com/Vikram-Indla/catalyst-prod-45/pull/259 (draft → main)
**Status:** all 18 phases built + post-build parity pass (Overview rebuilt, table alignment fixed, status pills canonical, 3 status-vocab bugs fixed). Verified live with seeded data.
**Source of truth (visual):** `/Users/vikramindla/Downloads/Release/design-handoffs/release-operations/01-artifact-source.html` (a JS-bundled static mock — open via local HTTP, see below).

---

## 1. What's done (verified live, seeded)

- **DB (Phase 1, APPLIED):** extended `rh_*` in place — 41 cols, 10 new tables, RLS helpers (`rh_user_has_role`/`rh_is_manager`/`rh_is_approver`, SECURITY DEFINER), indexes. Migration `supabase/migrations/20260618120000_release_operations_schema.sql`.
- **Sidebar + routes (Phase 2):** `ReleaseHubSidebar` → "Release Operations", §6 sections, all routes under `/release-hub/*`.
- **Overview (Phase 3 → rebuilt):** `CommandCenterPage.tsx` now matches the artifact — header + Create change/release, **8 KPI cards**, Upcoming Release Windows, Release Health bars, Pending Approvals (avatars), Change Execution Queue, **CATY Risk panel** (input-basis + Regenerate/Copy/Save-as-note), Recent Production Events.
- **Releases (Phase 4):** `AllReleasesPage` (JiraTable, lifecycle filter buckets) + Create Release modal (`CreateReleaseModal`, @atlaskit, richer fields).
- **Release Kanban (Phase 6):** `releaseBoardAdapter` on canonical `KanbanBoardShell`; view toggle on Releases list. (NOTE: artifact wants it as a SEPARATE nav item — see gaps.)
- **Release detail (Phase 5):** `ReleaseDetailPage` — 9-step tracker + 8 tabs (Overview/Scope/Readiness/Changes/Sign-offs/Release Notes/Production Events/Audit) + Notify list. Tab contents in `components/releasehub/detail/ReleaseDetailTabs.tsx`.
- **Change Records (Phase 7):** `AllChangesPage` (JiraTable, lifecycle buckets) + `CreateChgModal` (@atlaskit, **Approvers** + **Notify** fields, auto CAT-CHG-nnnn).
- **Change detail (Phase 8):** `ChangeDetailPage` — tracker + tabs + **SOP execution table** (`detail/SopExecutionTab.tsx`, expandable steps + evidence + status + apply-template bar).
- **SOP Templates (Phase 9):** `SopTemplatesPage` + `CreateSopTemplateModal` (steps) + apply-to-change.
- **Production Events (Phase 10):** `ProductionEventsPage` (JiraTable + detail modal w/ snapshot counts) + **auto-gen** on prod-release completion (in `useUpdateReleaseStatus`).
- **Calendar (Phase 11):** `ReleaseCalendarPage` — 4 lanes (release/change/freeze/prod) + conflict tint.
- **Sign-off Queue (Phase 12):** `SignOffQueuePage` + `ApprovalWindow` modal (Approve/Reject + comment).
- **Freeze Windows (Phase 13):** `FreezeWindowsPage` (conflict detection) + `CreateFreezeWindowModal`.
- **Settings (Phase 14):** `ReleaseSettingsPage` — read-only config reference.
- **Lifecycle guards (Phase 15):** `src/lib/release-ops/lifecycle.ts` — valid transitions, freeze-conflict block, approval-gating, production-needs-change. Wired into status hooks. Unit tests `src/lib/release-ops/__tests__/lifecycle.test.ts` (14 pass).
- **Traceability + notify (Phase 16):** `WorkItemTraceabilityPanel` (mounted in `CatalystViewBase`) + notify trigger SQL **PROPOSED** (see below).
- **AI advisory (Phase 17):** release-notes draft (generate/edit/save), missing-SOP advisory, release risk advisory — all advisory, purple, never auto-execute.
- **Acceptance report:** `docs/release-operations-ACCEPTANCE.md` (maps handoff §14 to done/partial/deferred).
- **Plan log:** `docs/release-operations-rebuild-PLAN.md` (per-phase detail + decisions).

### Post-build fixes (after parity audit with seed)
- `21f26bf03` — status-vocab bugs: Active-Releases KPI=0, filter tabs=0, raw `IN_READINESS` (the Overview/Releases code used legacy `in_progress/planning`; now lifecycle-aware + `StatusLozenge` humanizes labels).
- `7415fa0f9` — **table alignment**: all 5 release JiraTables had no `selectable`, so the content flex column became `:first-child` and inherited the checkbox-column styling (center, no padding, vertical divider). Enabled `selectable` → checkbox col first, content left-aligned + padded (also adds artifact's bulk-select).
- `3999f96fa` — Overview→artifact parity + canonical status pills (`toStatusCategory` now buckets the lifecycle stages: in-flight→blue, implemented/approved/completed→green).

---

## 2. DB — one thing still PROPOSED (needs Vikram apply)

`supabase/migrations/20260618130000_release_ops_notify_trigger.sql` — **NOT APPLIED.** On `rh_releases`/`rh_changes` status change → inserts a `notifications` row per `rh_notify_subscribers` user. Apply via `apply_migration` on Vikram's OK. (Caty-chat delivery deferred.)

---

## 3. Demo seed (in PROD — REMOVABLE)

Seeded for the parity comparison (5 releases, 3 changes, 5 pending sign-offs, 1 freeze window w/ conflict, 3 production events, 1 SOP template + steps, work-item links). Fixed UUID prefixes for easy cleanup.

**Cleanup SQL (run via Supabase to remove):**
```sql
DELETE FROM rh_sop_steps WHERE change_id LIKE '22222222-%';
DELETE FROM rh_sop_template_steps WHERE template_id='33333333-0000-0000-0000-000000000001';
DELETE FROM rh_sop_templates WHERE id='33333333-0000-0000-0000-000000000001';
DELETE FROM rh_change_signoffs WHERE change_id LIKE '22222222-%';
DELETE FROM rh_change_work_items WHERE change_id LIKE '22222222-%';
DELETE FROM rh_production_events WHERE release_key IN ('May Production Release','REL-2026-04','REL-2026-04-HF');
DELETE FROM rh_freeze_windows WHERE name='Payments PCI Audit';
DELETE FROM rh_changes WHERE chg_number IN ('CHG8841','CAT-CHG-19','CAT-CHG-21');
DELETE FROM rh_releases WHERE id LIKE '11111111-%';
```

---

## 4. Open items (gaps vs artifact — prioritized)

**Visual truth = `01-artifact-source.html`. Where it disagrees with handoff §52 TEXT, the artifact wins** (impl prompt says so).

| Pri | Gap | Detail |
|---|---|---|
| P1 | **Sidebar IA split** | Artifact has **Backlog** + **Release Kanban** as SEPARATE nav items. Mine = single "Releases" + board view-toggle. Split them: Backlog (table page) + Release Kanban (board page). |
| P1 | **Faceted filters** | Lists need dropdown filters (Product/Status/Health/Type/Environment[/Source for changes]) + bulk-action bar. Mine has status tabs + search + bulk-select checkbox only. |
| P1 | **Permission-gating (Viewer)** | Artifact disables Create/Review buttons for Viewer role (disabled-not-hidden, §11). Mine has no UI role-gating (RLS exists server-side). |
| P1 | **Richer table cols** | Releases: add Product/Items/Readiness%/Planned/Sign-off/Manager-avatar. Changes: add Source/SOP-progress/APPR/Manager-avatar + "Map external change" button. |
| P2 | Risk pill High vs Critical | Both render danger-pink (identical). Distinguish Critical (darker/bolder). |
| P2 | Prod-event snapshots | jsonb snapshots (work_items/BRs/commits/SOP-evidence/approvers) not populated on auto-gen → counts show '—'. |
| P2 | i18n / RTL | Hardcoded English strings throughout. |
| P2 | Release-level sign-offs | `rh_change_signoffs` is change-only; releases have no signoff table (approval-gating is change-level). |
| P2 | Gemini AI | CATY advisories are deterministic/rule-based; wire to a Gemini edge function for real prose. |
| — | Visual parity sweep | Remaining surfaces (Change detail SOP, Calendar, Freeze, Settings, modals) not yet screenshot-diffed vs artifact at full fidelity. |

---

## 5. How to verify / resume

- **Dev server:** `http://localhost:8080` (always 8080). Release Ops at `/release-hub/overview`.
- **Artifact (visual truth):** it's a JS-bundled self-unpacking page — `file://` is blocked by the Chrome extension. Serve it: `cd /Users/vikramindla/Downloads/Release/design-handoffs/release-operations && python3 -m http.server 8899`, then open `http://localhost:8899/01-artifact-source.html`. Toolbar (bottom) toggles Role (Manager/Viewer) + states (Data/Loading/Empty/Error).
- **Seed:** already in PROD (`lmqwtldpfacrrlvdnmld`). Surfaces render populated. Remove with §3 SQL.
- **Tests:** `npx vitest run src/lib/release-ops/__tests__/lifecycle.test.ts` (14 pass).
- **Audit per file:** `node design-governance/rules/audit.js src/<file>` (STRICT — must PASS).
- **Currently left running:** artifact HTTP server on `:8899` + 2 Chrome MCP tabs (live + artifact).

---

## 6. Guardrails honoured (keep honouring)

ADS tokens only (`var(--ds-*)`); JiraTable for all lists; StatusLozenge for status; @atlaskit modals/select/datepicker; 3-colour status guardrail (grey/blue/green; severity tones for health/risk only); purple only for AI; never `git add -A`; `git status` before commit; propose-SQL for migrations (Vikram applies); don't touch `product_releases`/legacy `releases`; no Incident Management.

---

## 7. Copy-paste block for next conversation

> Resume **Release Operations** parity work. Branch `release-operations-rebuild-01` (HEAD `3999f96fa`, pushed; draft PR #259). Read `docs/release-operations-HANDOVER.md` FIRST, then `docs/release-operations-ACCEPTANCE.md` + `docs/release-operations-rebuild-PLAN.md`.
> All 18 phases built + a parity pass done (Overview rebuilt to artifact, table alignment fixed via `selectable`, status pills canonical, status-vocab bugs fixed). Demo data seeded in PROD (cleanup SQL in HANDOVER §3).
> **Visual truth = the artifact**, served at `http://localhost:8899/01-artifact-source.html` (JS-bundled; `file://` blocked — serve via `python3 -m http.server 8899` from `/Users/vikramindla/Downloads/Release/design-handoffs/release-operations`). Dev app at `http://localhost:8080/release-hub/overview`.
> **NEXT (priority order):** (1) split sidebar into **Backlog + Release Kanban** nav items (artifact IA); (2) **faceted filter dropdowns** + bulk-action bar on the lists; (3) **Viewer permission-gating** (disable Create/Review by role, §11); (4) richer table cols (Product/Readiness/Sign-off/Manager-avatar; Change: Source/SOP/APPR + "Map external change"). See HANDOVER §4 for the full gap table.
> Rules: ADS tokens only, JiraTable + StatusLozenge canonical, @atlaskit modals, propose-SQL for migrations (one notify trigger `20260618130000` still UNAPPLIED), never `git add -A`, commit scoped + push per surface. Verify every UI change live with Chrome MCP against the seeded app + the artifact.
