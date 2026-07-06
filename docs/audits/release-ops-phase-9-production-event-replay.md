# Release Ops — Phase 9: Production Events + Full Deployment Replay

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 9
**Date:** 2026-07-06 · **DB:** staging cyij · **Build:** `tsc` clean · `npm run build` PASS. No drawers. No migration. No Folio/wiki files.

## Files delivered
- `src/hooks/useProductionEventReplay.ts` (new) — one aggregate reconstructing the whole deployment: event + release/change context, scope (snapshot-preferred, else reconstructed + labelled), SOP steps, commit + evidence ledgers, change+release sign-offs, emergency override, freeze eval, incidents/defects (by production-event / change / SOP-step lineage), a **deterministic** executive narrative, and result/closure. Read-only.
- `src/pages/releasehub/ProductionEventReplayPage.tsx` (new) — full-page replay at `/release-hub/production-events/:eventKey`.
- `src/pages/releasehub/ProductionEventsPage.tsx` — list rows open replay; Snapshot counts column; Replay/Preview actions (modal = quick preview only).
- `src/hooks/useReleaseHub.ts` — `ProductionEventRow.eventKey` added.
- `src/components/releasehub/detail/ChangeCockpitSections.tsx` — production-event card "Open replay →" (was "coming soon").
- `src/routes/FullAppRoutes.tsx` — replay route.

## Production Events list (§2)
Rows: title, release/change key, type, env, **Result** (canonical Lozenge — success/partial/failed/rollback), deployed, by, **Snapshot** (commits·evidence·approvers counts), Replay → / Preview. Row-click opens the full-page replay; the modal is a quick preview only. No drawer.

## Replay route (§3)
`/release-hub/production-events/:eventKey` resolves by `event_key` then falls back to `id`; safe not-found state; ProjectPageHeader breadcrumb trail → Production Events. Full-page header: key, title, result badge, release, change, environment, actual window, duration (red on overrun), executed-by + emergency-override / freeze markers. Reachable from list, Change Detail, and (where linked) Release Detail. No drawer.

## Executive summary (§4)
Deterministic narrative built from real event/change/release/SOP/sign-off/issue data, **honestly labelled "Deterministic — generated from event data (not AI)"** — no faked AI. Verified live: "…Outcome: SUCCESS. 2/9 SOP steps completed… Execution overran its planned window. An emergency override was used to bypass a gate… 1 open incident(s) and 1 open defect(s), 1 critical are linked to this deployment." (success does not hide the open critical — §13).

## Context / scope (§5–§6)
Release & change context (names, product, managers, risk, category) with links; change-primary for change-level events. Scope snapshot prefers the event's JSONB snapshot; if absent it reconstructs from current release links and **labels it "Reconstructed from current release links"**; a data-quality warning shows when neither exists.

## SOP execution timeline (§7)
Every step: seq, title, owner, planned vs actual duration (overrun ⚠), status (colour-coded, rollback amber), per-step issue count; expandable for type/role/env/repo/branch/commits/expected/actual/blocker/evidence. Verified live (9 steps; #51/#53 show "1 issue").

## Commit & evidence ledgers (§8–§9)
Grouped by SOP step; show captured commit/evidence + owner; **audit-gap warnings** ("⚠ 2 commit-required step(s) missing a commit", "⚠ 3 evidence-required step(s) missing evidence"). Evidence links open safely.

## Sign-off / override / freeze trails (§10–§11)
Full sign-off trail (release + change gates, roles, approvers, statuses incl. Overdue/Rejected-with-reason) — nothing flattened; **emergency override shown as a distinct dashed bypass** ("⚡ Emergency override — Approved · Bypassed freeze:production"). Freeze trail shows clean state or the conflicting window + override. Verified live.

## Incident / defect trail (§12)
Counts (incidents/defects/open/critical) + rows (type/key/title/severity/status, "from SOP step", link to detail) from `source_production_event_id` ∪ `source_change_id` (so issues raised before the event still appear by change/SOP lineage). Incident vs defect not mixed.

## Result & closure (§13)
Final result + open incidents/defects + change status; closure message adapts (success-with-open-critical, partial, failed/rollback, unknown) — audit-ready, never vague.

## Snapshot generation (§14)
Release→completed already auto-inserts a production event (`useUpdateReleaseStatus`); replay reconstructs live SOP/sign-off/issue/freeze detail on demand so it stays accurate even if the stored snapshot is thin, and never mutates history. Change-level auto-generation + richer stored snapshots remain a Phase-10 enhancement (documented).

## Integration (§15) + copy (§16)
Change Detail production-event card → "Open replay →"; Production Events list → replay; Release Detail linkage available via the same route. **Copy summary** copies a plain-text deployment summary (release/change/env/result/window/executor/SOP/issues + narrative) — no export overbuild, no hallucination.

## Empty/broken states (§17)
Not-found event; missing release ("change-only lineage"); no scope snapshot; no SOP steps; commit/evidence audit gaps; unknown result; reconstructed-scope label. Replay never looks blank; gaps are audit-visible.

## Deferred to Phase 10
Change-level production-event auto-generation + richer stored JSONB snapshots; release-level roll-up of change events; Release Detail replay-link surfacing; PDF export.

## ADS compliance
Full-page (not modal); ProjectPageHeader breadcrumb; `<div role="heading">` for token-sized headings; sentence case. typography + spacing baselines UNCHANGED (both actually dropped); no baseline bump needed. Color/CRE/TestHub green. No drawers. No Folio/wiki.
