# Release Ops — Phase 3: Change Record Cockpit

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 3
**Date:** 2026-07-06 · **DB:** staging cyij · **Build:** `tsc` clean · `npm run build` PASS.
**Scope:** Change Records list + full-page Change Detail cockpit. No drawers. UI only builds on the Phase 2 foundation; no schema changes.

## Files delivered
- `src/hooks/useChangeCockpit.ts` (new) — one parallel read model: linked releases, owners/participants, SOP readiness, sign-off readiness, freeze conflict eval, emergency override, incidents/defects, production event, + derived isTechnical/isProduction/isUnlinkedProduction.
- `src/components/releasehub/detail/ExecutionTimer.tsx` (new) — data-driven timer: upcoming (countdown) / running (elapsed + remaining) / overrun / completed / blocked / failed. Ticks 1s, derives from planned+actual timing. Reusable on For You later.
- `src/components/releasehub/detail/ChangeCockpitSections.tsx` (new) — 7 summary cards each with educational empty states.
- `src/pages/releasehub/ChangeDetailPage.tsx` — cockpit: header markers (override/freeze/unlinked-prod via SectionMessage), ExecutionTimer, tracker, Cockpit tab with sections + SOP/Work items/Sign-offs/Activity tabs (SOP tab jump from SOP card).
- `src/pages/releasehub/AllChangesPage.tsx` — cockpit columns: Flags (Unlinked-prod / Emergency / blocked-failed), Releases (m2m count), Planned datetime, existing SOP/APPR progress + manager; richer empty state.
- `src/hooks/useReleaseHub.ts` — `useChangesList` extended with slug, planned_start_at, releaseCount (batched m2m), isEmergency, isUnlinkedProduction, justification.
- `src/components/releasehub/CreateChgModal.tsx` — multi-release link (isMulti → m2m links), production-unlinked justification (conditional + required), planned end > start validation, writes planned_start_at/end_at + prod_no_release_justification.

## Change list behaviour (§2)
Rows show change #, title (slug route), status, risk, **Flags**, type, env, category, **Planned** datetime, **Releases** (count, "None (prod!)" when unlinked-prod), SOP progress, APPR progress, manager avatar, updated. Row click → full-page detail by **slug** (`/release-hub/changes/:slug`); legacy UUID resolves via `getById`. Production, emergency, blocked, high-risk, and unlinked changes are visually distinguishable. No drawer.

## Create/edit behaviour (§3)
Source (Catalyst/external), number, title, description, type, risk, env, category, planned window, **linked releases (many-to-many)**, approvers, notify. **Production change with no linked release requires a justification** (conditional field + validation). Planned end must be after start. Multi-release writes m2m links; first release also sets legacy release_id. Deferred (documented §Deferred): per-stream owner pickers on create and SOP-template apply-on-create.

## Change Detail cockpit (§4–§12)
- **Header**: number, title, status, risk, meta (type/env/category/window); markers for Emergency override, Freeze conflict, Unlinked production — never silent (SectionMessage). Breadcrumb mirrors Project module (`ProjectPageHeader` trail → Change Records).
- **Timer (§8)**: prominent, data-driven; "Starts in 1h 48m" (upcoming) / "Window started 42m ago — overdue" (overrun) / running elapsed / completed.
- **Linked releases (§5)**: each release name/env/readiness/status + navigate; unlinked-prod warning; empty hint.
- **Owners & participants (§6)**: change-level roles + SOP-step assignees resolved to avatar+name; missing critical owner flagged.
- **SOP summary (§7)**: steps/done/technical/assigned, commit/evidence/mandatory counts, running + next step, "Open execution →" tab jump; strong warning when technical production change has no SOP.
- **Sign-off summary (§9)**: change + release counts, pending/approved/rejected/overridden, blocking role, overdue, "Approval blocking execution" warning; dependency visual deferred.
- **Freeze summary (§10)**: no-conflict / conflict-blocked / conflict-override-approved.
- **Incident/defect summary (§11)**: linked incidents/defects with nav, clean state when none.
- **Production event summary (§12)**: event key/result/window/executed-by + View event; Replay shown disabled ("coming soon") — not falsely claimed.

## Status model (§13)
Existing 12-status tracker retained (Draft→…→Closed + Failed/Rolled back/Cancelled). Transition guards live in `lib/release-ops/lifecycle.ts` (freeze + approval gating). Full action wiring (request sign-off/override/apply-template/execute) surfaced via the cockpit's warnings + SOP entry point; heavier mutation flows deferred to Phase 4.

## Empty/broken states (§14)
Every section has a what/why/next hint or clean-state line: no linked releases, no SOP, no sign-offs, no freeze conflict, no incidents, no production event, missing owners, unlinked production. Verified live on CAT-CHG-21 (unlinked prod, no SOP, missing RM, blocked freeze) and CAT-CHG-19 (clean low-risk).

## Deferred to Phase 4+
SOP drag/drop runbook editor + timer-per-step, For You SOP cards, calendar execution view, timeline/board redesign, sign-off dependency graph, incident creation modal, production event replay page. Also deferred: per-stream owner pickers on create, apply-SOP-template step generation from create, and full status-action buttons (request sign-off/override/execute) — the cockpit shows the state + entry points; mutations land in Phase 4.

## ADS / contract compliance
Canonical only: JiraTable, StatusLozenge, CatalystAvatar, ads/SectionMessage, ProjectPageHeader, @atlaskit/tabs/modal. Zero bare colors (grep clean on all changed files). No drawers / side panels / peek panels introduced or remaining.
