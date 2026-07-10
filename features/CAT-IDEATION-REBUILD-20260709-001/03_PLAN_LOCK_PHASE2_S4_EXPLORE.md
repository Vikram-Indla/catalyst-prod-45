# PLAN LOCK — Phase 2 Slice S4: Explore — full list + filter chips + search

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved by Vikram in chat ("Explore page next") 2026-07-11 · **Timebox**: 2h
**Supersedes**: nothing. Builds on `ExplorePage.tsx` as it stands after the other session's S2 landed (`5c08c939d`) — that commit already wired `CreateIdeaModal`/`useCreateIdeaParam` into the empty state; this slice keeps that wiring and adds the real list.

## Objective
Replace the Explore empty-state stub with the real browse/search surface: every idea (not just Inbox's submitted/screening/evaluation subset), a filter-chip row (Status + Class), a search box, and the results in `JiraTable`. Design evidence: 05 §C row 2.

## Non-scope
- Column customizer UI — `JiraTable` already ships this (three-dot header menu / column picker) per the evidence's own adaptation note ("JiraTable ColumnHeaderMenu already provides the latter"). No new work needed.
- Votes/Score columns — no `idn_votes`/`idn_scoring_*` join wired yet; own slice.
- Saved views, JQL-style query bar, bulk actions — not in 04 §C.2's field list.
- No DB migration — schema untouched.

## Design evidence
- 05 §C row 2: **Deel** People table — "Filter-chip row above table + 'Customize columns' checklist panel." **Dovetail** Contacts table — "Per-field visibility toggles; colored semantic chips in cells" → maps to our existing Status/Class chips (ADS-owned Lozenge colors only, no rainbow).
- Row 12 (Canny) cross-validates the column set (key/class/summary/status) as sufficient for a list surface.

## Canonical components
- `JiraTable` — list rendering, same pattern as S1 Inbox.
- `StatusLozenge` — status pill (already proven S1/S3).
- `@atlaskit/textfield` — search box.
- Filter chips: simple toggle buttons using ADS tokens (no non-canonical component needed — this is a controlled multi-select over a small enum, not a new interaction pattern).

## Files to modify
- `src/hooks/useIdeationExplore.ts` (new) — fetch ALL `idn_ideas` (no status/class restriction, unlike S1's Inbox subset).
- `src/modules/ideation/pages/ExplorePage.tsx` — rebuild (keep existing `CreateIdeaModal`/`useCreateIdeaParam` wiring from S2 intact).

**Files forbidden**: `InboxPage.tsx`, `DetailPage.tsx`, `PortfolioPage.tsx`, `CreateIdeaModal.tsx`, `useCreateIdea*.ts` (S2's files — don't touch), `src/components/ads/DropdownMenu.tsx` and `.codebase-memory/*` (unrelated concurrent session's in-progress work, currently uncommitted in this checkout — not touched, not staged), any migration file, `src/services/ideationService.ts`.

## Data rules
- Zero legacy carryover: `idn_ideas` only.
- Zero-assumption rendering: filter chips only list statuses/classes that exist in `IdeaStatusKey`/`IdeaClass` — no fabricated categories.
- ADS tokens only; status/class rendering reuses S1's `StatusLozenge`/`ClassBadge` pattern (re-declared locally here per S1's own precedent of not cross-importing from `InboxPage.tsx`).

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits on touched files
- [ ] Screenshots (Chrome MCP, isolated dev instance, flag ON): full list (all 6 seeded ideas across all 3 statuses), a Status filter chip narrowing the list, search narrowing the list, light + dark

## Stop conditions
Any DB schema change needed → stop, re-plan. Any edit required to a file on S2's or another concurrent session's list → stop, ask.

## Drift / rebaseline
None anticipated — pure additive read + client-side filter over existing S1 schema.
