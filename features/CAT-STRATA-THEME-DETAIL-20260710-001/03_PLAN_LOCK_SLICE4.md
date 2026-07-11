# Plan Lock — Slice 4: Governance migration + Decisions/Actions + relationships rename
CAT-STRATA-THEME-DETAIL-20260710-001

## Objective
Add Theme-scoped governance (Decisions/Actions) to the Theme detail page —
the one RED FLAG-class schema change approved in D1 — and rename "Map
edges" to a business-readable label.

## RED FLAG — schema change, read before approving

**What might regress:** `strata_decisions`/`strata_actions` are live tables
used today by `StrataReviewsPage.tsx` (snapshot-scoped governance). Any
change to `strata_create_decision`'s signature risks breaking that page's
existing decision-creation flow.

**Why it's safe:** the new parameter is additive and optional
(`p_element uuid DEFAULT NULL`), appended at the end of the argument list.
`StrataReviewsPage.tsx`'s existing call
(`governanceApi.createDecision({..., snapshotId: ...})`, no `elementId`)
continues to omit the new param entirely — Postgres uses the default `NULL`,
identical behavior to today. `strata_actions`/`strata_create_action` are
**not touched at all** — actions inherit Theme scope transitively via their
parent decision's `element_id`, avoiding a second schema change.

**Evidence:** confirmed via full-repo grep that no other migration has ever
touched these two tables beyond the original CREATE TABLE + RLS
(`supabase/migrations/20260705100400_strata_lineage_governance.sql`), and
`strata_create_decision`'s only other caller is `StrataReviewsPage.tsx:1152`
which does not pass positional args past `p_evidence_refs` (uses named
`p_x =&gt;` style — confirmed pattern), so an appended optional param cannot
shift its existing arguments.

**Safer option considered and rejected:** widening `strata_gate_instances`-style
`subject_type` polymorphic linking to include `'element'`. **Explicitly
rejected** — a near-identical change was made and then reverted 10 days ago
in `supabase/migrations/20260710170000_strata_gate_scope_correction.sql`,
whose own comment calls admitting `'element'` into a shared polymorphic
subject enum "an investment-lifecycle concept that only belongs to the VMO
domain" and a defect. A dedicated nullable FK column (mirroring
`strata_project_cards.theme_id`, an already-proven pattern) avoids repeating
that exact mistake.

**Decision needed from you:** confirm the migration SQL below before I run it.

## Exact migration SQL (for your review)

```sql
-- supabase/migrations/20260710190000_strata_decision_element_linkage.sql
-- CAT-STRATA-THEME-DETAIL-20260710-001 Slice 4 — Theme-scoped governance.
-- Additive-only: new nullable FK, new optional RPC parameter appended last.
-- strata_actions is untouched — actions inherit Theme scope transitively
-- via their parent decision's element_id (decision_id already required).

ALTER TABLE public.strata_decisions
  ADD COLUMN IF NOT EXISTS element_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_strata_decisions_element
  ON public.strata_decisions(element_id) WHERE element_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.strata_create_decision(
  p_title text,
  p_decision_type text DEFAULT 'governance',
  p_forum text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_snapshot uuid DEFAULT NULL,
  p_evidence_refs jsonb DEFAULT NULL,
  p_element uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; dkey text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating a decision requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'decision title is required'; END IF;
  IF p_decision_type NOT IN ('governance','gate','escalation','action_only') THEN
    RAISE EXCEPTION 'decision type must be governance | gate | escalation | action_only';
  END IF;
  IF p_snapshot IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_snapshots WHERE id = p_snapshot) THEN
    RAISE EXCEPTION 'snapshot not found';
  END IF;
  IF p_element IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_element) THEN
    RAISE EXCEPTION 'strategy element not found';
  END IF;

  dkey := 'DEC-' || nextval('public.strata_decision_key_seq');
  INSERT INTO public.strata_decisions
    (decision_key, forum, snapshot_id, decision_type, title, description,
     owner_id, due_date, status, evidence_refs, created_by, element_id)
  VALUES
    (dkey, p_forum, p_snapshot, p_decision_type, btrim(p_title), p_description,
     p_owner, p_due_date, 'open', p_evidence_refs, auth.uid(), p_element)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_decisions', new_id, 'RPC:create_decision', auth.uid(),
          format('%s "%s" opened%s', dkey, btrim(p_title),
                 COALESCE(' in ' || p_forum, '')));
  RETURN new_id;
END;
$$;
```
No RLS changes needed — existing role-based policies (`strategy_office`/
`vmo_validator`/admin) already cover the new column; it adds no new access
pattern, only a new optional filter dimension.

## Non-scope (this slice)
- `strata_actions` schema untouched (no migration needed — see above).
- No new decision_type or status values.
- No changes to `strata_gate_instances` or the VMO gate-scheduling domain.
- No changes to `StrataReviewsPage.tsx`'s existing snapshot-scoped governance
  flows — this is a second, independent entry point into the same tables.
- No Project Cards/execution-summary changes (Slice 3, done).

## Files to modify
1. `supabase/migrations/20260710190000_strata_decision_element_linkage.sql`
   — exact SQL above, pending your confirmation.
2. `src/modules/strata/types.ts` — add `element_id: string | null` to
   `StrataDecision`.
3. `src/modules/strata/domain/index.ts` — add `elementId?: string` to
   `createDecision`'s input type, pass `p_element: input.elementId ?? null`.
4. `src/modules/strata/pages/StrataStrategyElementDetailPage.tsx`:
   - Rename "Map edges" → **"Strategy relationships"** (both the panel
     title and the empty-state header — the only two literal occurrences
     in the codebase, confirmed by full-repo grep; underlying table/column/
     `relationship_type` enum values are untouched).
   - Add a **Governance** panel (Theme-equivalent only, gated on
     `isThemeElement`): fetch `useDecisions()`/`useActions()` (existing
     hooks, unfiltered — same established client-side-filter pattern as
     Objectives/OKRs/Project Cards on this page), filter decisions by
     `d.element_id === element.id`, filter actions by
     `a.decision_id ∈ (this Theme's decision ids)`.
     - Row per decision: title, status Lozenge, due date, open-action count
       for that decision, click has no target (no decision detail route
       exists — matches `StrataReviewsPage.tsx`'s own row-menu-only pattern,
       out of scope to build one this slice).
     - "Record Decision" action (gated on `canGovern` =
       `['strategy_office','vmo_validator','strata_admin']`, matching the
       RPC's actual role check exactly — distinct from `canAuthor` since
       `vmo_validator` can govern decisions but not edit Theme/Objective
       structure) → `StrataFormModal` (reused, not `StrataDecisionModal`
       which research confirmed is an unrelated generic verdict-picker used
       elsewhere, not the actual decision-authoring surface) with fields
       title/decision_type/forum/description/owner/due_date, calling
       `governanceApi.createDecision({..., elementId: element.id})`.
     - "+ Action" per-decision-row action (same `canGovern` gate) →
       `StrataFormModal` with fields title/owner/due_date/note, calling
       `governanceApi.createAction({ decisionId: <that decision's id>, ... })`
       — unchanged signature, matches `StrataReviewsPage.tsx`'s existing
       per-decision action-creation pattern exactly.
     - Empty state: "No decisions recorded for this Theme yet." + Record
       Decision action.
     - Small stat line: open decisions / open actions / overdue actions
       (due_date < today, status open/in_progress) — computed client-side,
       same pattern as Execution Summary's rollup counts.

## Files forbidden
- No changes to `StrataReviewsPage.tsx` (its snapshot-scoped flows are a
  separate, untouched entry point into the same tables).
- No changes to `strata_gate_instances` or VMO gate scheduling.
- No changes to `strata_map_edges` schema, `relationship_type` enum, or the
  Strategy Map page (`StrataStrategyMapPage.tsx`) — rename is UI-copy-only
  on the Theme detail page, confirmed zero other occurrences exist.

## UI/UX rules
- ADS tokens only, no hex/Tailwind (CLAUDE.md hard stop).
- Reuse `StrataPanel`/`StrataFormModal` chrome — no new modal primitive.
- Reuse the button-row list pattern already established on this page
  (Objectives, Linked Project Cards) for the Governance panel's decision
  rows — no new list-row component invented.

## Data/backend rules
- One migration, additive-only, as specified above — no other schema touch.
- `createDecision`/`createAction` reused verbatim except the one added
  optional parameter on `createDecision`.

## Integration/wiring rules
- On successful Record Decision / Create Action, refetch via
  `useInvalidateStrata()` (existing pattern) so the Governance panel updates
  immediately.

## Screenshot checklist
1. Theme detail page — "Strategy relationships" replaces "Map edges" (panel
   title and empty state).
2. Theme detail page — Governance panel empty state for a Theme with no
   decisions.
3. Record Decision → modal opens, submit → decision appears in the panel
   immediately with correct status Lozenge.
4. Create Action on that decision → action count increments on the row.
5. Stat line (open decisions/open actions/overdue actions) matches a manual
   tally.
6. `StrataReviewsPage.tsx` — existing decision/action creation flows
   unaffected (regression check: create a snapshot-scoped decision there,
   confirm it still works identically, `element_id` is null on that row).

## Validation commands
```
npx tsc --noEmit -p tsconfig.json
npx eslint <changed files>
npm run lint:colors:gate
npm run audit:ads:gate
npm run build
```
Plus a direct SQL check post-migration confirming the column/index exist and
`StrataReviewsPage.tsx`'s decision creation still inserts `element_id = NULL`.

## Stop conditions
- If the migration fails to apply cleanly (e.g. sequence name mismatch) →
  stop, report exact error, do not retry blindly.
- One correction loop max on any blocker; then accept/split/rebuild/stop+revert.

## Drift/rebaseline rules
Any deviation from this file list or non-scope requires a Plan Lock update
logged in `08_DRIFT_LOG.md`, not silent expansion. This is the final slice
of CAT-STRATA-THEME-DETAIL-20260710-001 — after this, the feature closes
out with a final summary against the original acceptance standard.
