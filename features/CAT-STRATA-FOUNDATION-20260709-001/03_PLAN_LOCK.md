# PLAN LOCK — CAT-STRATA-FOUNDATION-20260709-001 (build phase, strata-standalone)

**Approved**: 2026-07-09 via user `/goal` directive ("build it on the strata standalone branch … continue there with the complete goal … micro-interactions as acceptance criteria … alert on context health"). Recorded in `00_admin/DECISIONS.md`. Branch: `strata-standalone` (CON-003). Session owns the origin checkout (user switched it via GitHub Desktop).

## Objective
Close frozen REQ-001..023 on `strata-standalone`, following `50_design/DESIGN-DIRECTION.md` (Command Room). Wave-sliced; one commit per wave slice; ≤2h per slice.

## Non-scope
- No prod DB DDL from this session. Migration FILES are authored + committed; applying to staging requires the project-ref check (`supabase/.temp/project-ref` = `cyijbdeuehohvhnsywig`) at apply time.
- No Astryx revival; no new strategy module; no `:id` route params; no bare colors.

## Waves and files

**W1a — Terminology (REQ-001/002/003)**
- Modify: `src/modules/strata/types.ts`, `hooks/useStrata.tsx`, `domain/index.ts`, `pages/StrataStrategyRoomPage.tsx`, `pages/StrataStrategyElementDetailPage.tsx`, `pages/StrataStrategyMapPage.tsx`
- New: `supabase/migrations/<ts>_strata_theme_charter_rename.sql`, `src/modules/strata/__tests__/terminology.guard.test.ts`
- AC: grep for Play in src/modules/strata returns 0 non-icon hits; guard test green; migration renames table+RPC preserving data/RLS.

**W1b — IA (REQ-004/005/006)**
- Modify: STRATA sidebar component (probe: EnterpriseSidebar vs dedicated), `routeRegistry.ts` STRATA titles, area landing headers for cycle context.
- AC: sidebar renders exactly 4 area groups (Strategy Execution / Balanced Scorecard / Value Management Office / Governance) + Configuration; all links resolve; cycle name+period visible on the 4 landings.

**W2 — Linkage (REQ-007..011)**: additive migration `strata_project_cards.objective_element_id` (+guard trigger), UI card detail Theme+Objective, Blockers surfaced; negative tests for Theme↔Portfolio ban.

**W3 — Areas + Command Room (REQ-012..015)**: CEO vs Sector/CXO grouping, VMO/Governance labels, executive KPI band, scorecard grid side panel, segmented value bars, board-pack layout per SRC-M1..M7.

**W4 — Consolidation/seed/tests (REQ-016..023)**: StrategyCockpit + Astryx deletion + CLAUDE.md fix, legacy stack decommission+migrate (REQ-022/023 — own slice, reversible, row-count reconciliation), canonical-chain seed, smoke suite.

## Micro-interaction acceptance criteria (apply to every UI slice — goal directive)
1. Hover: every interactive row/node/card shows `--ds-background-neutral-subtle-hovered` (or component-owned) hover state; cursor pointer only on actionable elements.
2. Focus: keyboard focus ring (`--ds-border-focused`) visible on all interactive elements; tab order follows visual order.
3. Loading: every async surface renders Atlaskit spinner/skeleton — never a blank flash; no layout shift on data arrival.
4. Empty: every list/panel has a canonical empty state; unknown data renders dash/nothing (zero-assumption), never a fabricated default.
5. Transitions: panel open/close and map zoom/pan animate ≤200ms ease; no jank on 100-node map.
6. Feedback: every mutation shows Atlaskit flag (success/error) and optimistic or reload-consistent state; destructive actions get confirm modal.
7. Drilldown continuity: map node → detail → back preserves scroll/zoom position.
8. Tooltips on truncation and on status lozenges (explain RAG meaning).
Verification: each merged UI slice lists these 8 checks in `06_VALIDATION_EVIDENCE.md` with pass/fail + evidence (DOM probe or screenshot).

## Validation commands (per wave)
`npx tsc --noEmit` (scoped ok), `npx vitest run src/modules/strata`, `npm run lint:colors:gate`, `npm run audit:ads:gate`, dead-link nav sweep, screenshots for UI acceptance.

## Stop conditions
- Any regression signal on non-STRATA surfaces → RED FLAG protocol.
- Context health < ~15% headroom → write 07_HANDOVER.md and stop cleanly.
- Migration ledger conflict or project-ref mismatch → STOP.

## Drift/rebaseline
Discovery was on `main`; drift probe on `strata-standalone` (2026-07-09) confirms parity for W1 scope (14 Play refs / 6 files; 16 pages; 24 strata migrations). Any W2+ schema mismatch → log to 08_DRIFT_LOG.md and rebaseline before continuing.
