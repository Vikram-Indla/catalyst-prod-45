# 07 — Open Questions (human decision required before any code)

**Date:** 2026-06-23. Ordered by blocking severity. Q2 and Q3 block all implementation.

## Q1 — Business Request / Production Incident release linkage (out of scope)
Spec 2 proposes adding an optional release field to the Business Request detail and the Production Incident detail sidebars (`business_requests.release_id`, `production_incidents.release_id`). This concerns work-item detail sidebars, **not** `/release-hub/releases`.
- **Decision needed:** Confirm this Business Request / Production Incident release linkage stays **out of scope** for the Releases effort. It is excluded from every phase here. (No code path was created for it.)

## Q2 — Which data model is the target? **(BLOCKER)**
Three live, mutually-incompatible models exist:
- **A. `rh_releases`** — what the page shows today (9-stage lifecycle, enterprise Release Ops, 1 row). Keep it.
- **B. `releases`** — the spec-named table, but **empty + schema-divergent** (QA-bloated, 10-value enum, no `archived`/`sequence`). Adopt + migrate it to match the spec.
- **C. New/other** — `release_versions` (empty) or a fresh table.
- **Recommendation:** **A (keep `rh_releases`)** and pursue Jira-*parity of behavior/visuals* on top of it, rather than introducing a 4th parallel model. Building B means schema work + reconciling 30+ existing `rh_*` tables — high cost, high drift risk.

## Q3 — Sectioned version list, or keep the canonical backlog table? **(BLOCKER)**
The spec wants UNRELEASED / RELEASED / ARCHIVED sections with per-row progress + inline version create. The live page is a flat canonical `BacklogPage` (JiraTable).
- **Decision needed:** (a) Keep the canonical flat table and only add parity touches (progress column, labels)? (b) Produce the 3 sections via JiraTable's **existing group-by** (no new component)? (c) Something the table genuinely can't do (→ separate GAP approval, no silent build)?
- **Recommendation:** (b) — try group-by first; never fork JiraTable or hand-roll a sectioned table.

## Q10 — Additive canonical-contract extension for release columns ✅ RESOLVED 2026-06-23
Approved + implemented as **Phase 1B** (see `06`). Added opt-in `columnLabelOverrides`, `defaultVisibleColumns`, `nonDestructiveActions` + 3 release-only columns (`release_progress`/`start_date`/`description`) to the canonical contract, all `if (dataSource?.X)`-guarded. Other 5 hubs verified unchanged. `/release-hub/releases` now structurally shows Version / Status / Progress / Start date / Release date / Description / Actions. No fork, no schema/RLS change. Remaining sub-items still open: **Q11** below.

## Q12 — Auth/session project mismatch **(BLOCKER for row-rendering acceptance)**
The verification browser's Supabase session is issued by project `cyijbdeuehohvhnsywig` while the app data client targets `lmqwtldpfacrrlvdnmld` → authenticated reads 401 (PGRST301) → `/release-hub/releases` shows 0 rows.
- **Must be resolved manually before row-rendering acceptance:** clear local auth/session storage, log in again against `lmqwtldpfacrrlvdnmld`, reopen `/release-hub/releases`, confirm session `iss` = `https://lmqwtldpfacrrlvdnmld.supabase.co/auth/v1` and the row renders. Not a code defect; not in Phase 1B scope.

## Q13 — Jira screenshots provided; Phase 1C ran (partial) ✅ 2026-06-23
Jira screenshots provided (releases list, more-actions menu, create-release modal). Phase 1C shipped the one safe, blast-radius-zero delta: header col 1 `Version`→`Release` (live-verified). The remaining screenshot items are **blocked by architecture or by P0 rules**, not by missing screenshots — see Q14.
- **Screenshots not yet saved to repo** at `docs/release-hub/screenshots/jira/` (chat-only). Save them for the next phase's pixel reference if pursued.

## Q14 — Phase 1C deferred items (decisions needed before they can ship)
1. **"More actions" header text** — JiraTable (`JiraTable.tsx:1190-1199`) renders the column-picker trigger *instead of* the `__actions` label whenever the column manager is on (always, on BacklogPage). Labeling it requires editing shared header logic → all 5 hubs. **Decision:** leave the actions header as the picker (current), or approve a shared-file change + 5-hub regression sweep to show "More actions"?
2. **"No work items" progress** — `rh_releases.readiness_pct=null` means *unknown readiness*, not *zero linked work items*; the adapter exposes no work-item count. Rendering "No work items" violates CLAUDE.md zero-assumption P0. **Decision:** keep truthful `—`, or add a real linked-work-item count source (join `rh_release_work_items`/`rh_release_issues`) to back a true "No work items"?
3. **Overdue release date in red** — truthful (date < today) but needs danger color over the shared `makeDateEditCell` inline editor (cascade-trap, CLAUDE.md 2026-06-22/06-07) and cannot be DOM-probed while the auth blocker yields 0 rows. **Approach for next phase:** additive opt-in `dateDangerWhenOverdue` flag on the release adapter + guarded danger render in the shared `target_date` column def (mirrors the accepted `nonDestructiveActions` pattern), built once rows render so the computed style can be probed.
4. **UNRELEASED/RELEASED/ARCHIVED lozenge** — `rh_releases` uses a 9-stage lifecycle; Jira's 3-state model has no truthful mapping. Tied to Q2/Q3 + Phase 4 schema work.

## Q11 — Release progress: only `readiness_pct` exists today **(open, non-blocking)**
The Progress column renders `rh_releases.readiness_pct` via the canonical `ReleaseProgressBar` (single percent). Jira Releases shows a 3-segment done/in-progress/to-do bar. `rh_releases` has no per-status issue breakdown.
- **Decision needed (later phase):** is single-percent readiness acceptable for parity, or should a future phase compute a done/in-progress/to-do breakdown (requires joining `rh_release_work_items`/`rh_release_issues` — out of Phase 1B scope)?

## Q4 — Permission gating on `/release-hub/releases` (security hardening, NOT Phase 1)
The route has **no `ModuleGuard`** (`/release-hub/overview` does). `rh_releases` RLS is now confirmed (`05` Model A): SELECT open to authenticated, writes gated by `rh_is_manager(auth.uid())`.
- **Decision needed:** Schedule adding `<ModuleGuard moduleCode="releases">` to the route as a **standalone security-hardening task** (it is explicitly **not** the first Jira-Releases build phase). Confirm whether module-level gating is sufficient or whether write actions also need an additional app-layer role check beyond the existing `rh_is_manager` RLS.

## Q5 — Create UX: inline form vs modal
Spec 1 (inline form at top of Unreleased) conflicts with Spec 2 (modal). The live page uses backlog inline-create; a rich `CreateReleaseModal` already exists but isn't wired here.
- **Decision needed:** Inline create (current), or surface the existing `CreateReleaseModal`?

## Q6 — Sprints scope
Spec 2 makes Sprints + `story_sprints` core. `sprints` table **does not exist**; `story_sprints` is empty. Spec 1's 80 paths never mention Sprints.
- **Decision needed:** Are Sprints in scope for `/release-hub/releases` at all, or strictly out for now? (Recommend: **out** — not part of the named route's surface.)

## Q7 — Palette / token source
Spec Part 1 hardcodes old Jira hex (`#172B4D` etc.); Spec 2 uses newer ADS tokens; CLAUDE.md bans bare hex.
- **Resolved by policy (no decision needed):** All colors via `var(--ds-*)` ADS tokens. Spec hex = reference values to map to tokens only.

## Q8 — Legacy `AllReleasesPage.tsx`
`src/pages/releasehub/AllReleasesPage.tsx` claims this route but is unrouted (dead). 
- **Decision needed:** Confirm it can be deleted in a later cleanup (CLAUDE.md deletion + importer-grep rule), or is it kept intentionally?

## Q9 — Spec authority vs live code
Spec 2 claims "95% confidence, zero ambiguity, ready for Phase 3" but its migrations don't exist and its model isn't shipped. CLAUDE.md: in-code reality wins over stale handovers/specs.
- **Decision needed:** Treat the specs as *target intent* (subject to Q2/Q3) rather than literal build orders? (Recommend: yes.)
