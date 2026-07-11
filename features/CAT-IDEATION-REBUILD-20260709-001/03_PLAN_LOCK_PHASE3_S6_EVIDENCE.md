# PLAN LOCK — Phase 3 Slice S6: Evidence panel

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved (goal directive) 2026-07-11 · **Timebox**: 1.5h

## Objective
`idn_evidence` (P0, "Decisions cite sources" per 04's feature table) has real schema since S1 but zero UI. Build the Detail-page evidence list + add-evidence form for the two kinds buildable without further infra: `snippet` (verbatim text) and `link` (URL + attribution). RLS here is clean — no self-referential lock bug like Merge/Conversion hit (checked: `idn_evidence_insert`'s `WITH CHECK` only tests `added_by = auth.uid()` and the idea's *current* lock state, not any field this insert itself sets).

## Non-scope
- `document` kind — needs `ai_documents` + docintel upload flow, separate infra.
- `voice_transcript` kind — needs the voice-flow pipeline wired to evidence, separate infra.
- `image` kind — needs an upload/attachment pipeline, separate infra.
- Evidence re-linking on merge — flagged already in Phase 3 S5's Plan Lock as needing a migration; this slice doesn't touch it.

## Files to modify
- `src/hooks/useIdeationEvidence.ts` (new) — list + add (snippet/link only) + delete (own row).
- `src/modules/ideation/pages/DetailPage.tsx` — Evidence section in the main column, below Problem/Proposed value.

**Files forbidden**: any migration (schema exists, unchanged).

## Data rules
- Zero-assumption: `kind='link'` requires `url`; `kind='snippet'` requires `body` — the `idn_evidence_has_content` CHECK already enforces this server-side, client validates the same before submit to avoid a round-trip error.
- ADS tokens only.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits
- [ ] Real DB proof: add a snippet + a link evidence item on a real staging idea, confirm both rows in `idn_evidence`, confirm they render; delete one, confirm the row is gone

## Stop conditions
Any DB schema change needed → stop, re-plan.
