# PLAN LOCK — Phase 2 Slice S5: Portfolio — Value × Effort field chart

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved by Vikram in chat ("yes" to taking Portfolio) 2026-07-11 · **Timebox**: 2h
**Supersedes**: nothing. Last slice in Phase 2's core CRUD list per `07_HANDOVER.md`.

## Objective
Replace the Portfolio empty-state stub with the real Value×Effort scatter (04 §C.7 "Field" view): labeled quadrants (Quick Wins/Big Bets/Fill-ins/Money Pit, per the design mock's own naming — not invented here), real `idn_idea_scores` data plotted, and the "unscored ideas tray" state the spec requires.

## Non-scope (explicitly deferred — 04 §C.7 is a large surface)
- **Funnel toggle** (stage-column board view) — separate view type, own slice.
- **Inline decide actions** (Approve/Park/Decline footer bar) — needs `ph_wf_*` guard evaluation (Phase 3 workflow scope), not CRUD.
- **Bubble size = votes** — no `idn_votes` data model wired yet (D3 vote control still its own undelivered slice).
- **Filters, model switcher (`model: Default v3 ▾`)** — only one model exists (`default-v1`); a switcher over one option is inventing UI for a case that doesn't exist yet.
- No DB migration — schema untouched. Scores for this slice were seeded as data (not schema) directly via Supabase MCP, same pattern as S1's idea seeds.

## Design evidence
- 04 §C.7 mock (verbatim quadrant labels): Q1 Quick Wins (high value, low effort) · Q2 Big Bets (high value, high effort) · Q3 Fill-ins (low value, low effort) · Q4 Money Pit (low value, high effort). "unscored ideas tray at edge ('needs scoring: N')" is a named required state — built here, not invented.
- 05 §C row 7 (TheyDo Opportunities Matrix, image-verified): configurable axis dropdowns → out of scope (single model, D4 fixed axes); **adopt empty-state coaching text on a blank matrix** ("Add Value and Effort scores to place ideas on the matrix") — built here for the zero-scored case.
- 04 §C.7 component note: "value/effort field chart = new component (flagged §D gap; no canonical scatter exists)" — recharts scatter is D9's approved non-canonical component #3, already a dependency (`recharts ^3.5.1`, confirmed in S1 Plan Lock's Phase 1 resolved-items).

## Canonical components
- `recharts` `ScatterChart` — the one D9-approved non-canonical exception for this exact surface.
- `StatusLozenge`, `HubPageHeader`, `EmptyState` — proven in S1/S3/S4.
- Quadrant point color = class (reuses the `ClassBadge`/Lozenge-adjacent token pattern, not a new palette).

## Files to modify
- `src/hooks/useIdeationPortfolio.ts` (new) — fetch `idn_ideas` + joined `idn_idea_scores` for the `default-v1` model's `value`/`effort` drivers; split scored vs unscored.
- `src/modules/ideation/pages/PortfolioPage.tsx` — rebuild (keep S2's `CreateIdeaModal`/`useCreateIdeaParam` wiring intact).

**Files forbidden**: `InboxPage.tsx`, `DetailPage.tsx`, `ExplorePage.tsx`, `CreateIdeaModal.tsx`, `useCreateIdea*.ts`, `src/components/ads/DropdownMenu.tsx` and `.codebase-memory/*` (another concurrent session's in-progress, uncommitted work — not touched), any migration file, `src/services/ideationService.ts`.

## Data rules
- Zero legacy carryover: `idn_ideas` + `idn_idea_scores` + `idn_scoring_models`/`idn_scoring_drivers` only.
- Zero-assumption rendering: an idea missing either the `value` or `effort` score is **not plotted** — it goes in the unscored tray, never given a fabricated midpoint position.
- ADS tokens only.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits on touched files
- [ ] Screenshots (Chrome MCP, isolated dev instance, flag ON): scatter with real scored ideas spanning all 4 quadrants, unscored tray showing the correct count, light + dark

## Stop conditions
Any DB schema change needed → stop, re-plan. Any edit required to a file on another concurrent session's list → stop, ask.

## Drift / rebaseline
None anticipated.
