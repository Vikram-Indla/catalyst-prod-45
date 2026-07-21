/**
 * EXECMODEL S16 — Objective-owned OKR ownership edge (CAT-STRATA-EXECMODEL-20260721-001, D-0/D-1).
 * The agreed hierarchy is Perspective -> Theme -> Strategic Objective -> OKR -> KR. OKRs gain an
 * authoritative objective_id (Objective = strata_strategy_elements.element_type='objective', parent
 * a theme). Active OKRs are re-parented deterministically (Method A legacy link, Method B sole child)
 * or parked as exceptions — NEVER guessed. Closed OKRs are frozen (excluded from backfill). theme_id
 * is retained as derived history and never rewritten. Applied + verified on staging (20260721102019).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const SQL = readFileSync(join(DIR, '20260721102019_strata_s16_objective_owned_okr.sql'), 'utf8');

describe('EXECMODEL S16 — Objective-owned OKR', () => {
  it('adds an authoritative objective_id FK to OKRs (identity + versions) with an index', () => {
    expect(SQL).toMatch(/ALTER TABLE public\.strata_okrs[\s\S]*ADD COLUMN IF NOT EXISTS objective_id uuid REFERENCES public\.strata_strategy_elements/);
    expect(SQL).toMatch(/ALTER TABLE public\.strata_okr_versions[\s\S]*ADD COLUMN IF NOT EXISTS objective_id uuid/);
    expect(SQL).toMatch(/CREATE INDEX IF NOT EXISTS idx_strata_okrs_objective/);
  });

  it('guards objective_id: must be an objective whose parent is a theme, theme consistent', () => {
    expect(SQL).toContain('FUNCTION public.strata_okr_objective_check()');
    expect(SQL).toMatch(/et <> 'objective'[\s\S]*INVALID_OBJECTIVE/);
    expect(SQL).toContain('OBJECTIVE_THEME_MISMATCH');
    expect(SQL).toMatch(/TRIGGER trg_strata_okr_objective_check BEFORE INSERT OR UPDATE OF objective_id ON public\.strata_okrs/);
  });

  it('re-parents ACTIVE OKRs deterministically and parks the rest as exceptions', () => {
    // provenance map + exceptions view
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.strata_okr_objective_map/);
    expect(SQL).toMatch(/method text CHECK \(method IN \('legacy_objective_element','sole_child_objective'\)\)/);
    expect(SQL).toMatch(/CREATE OR REPLACE VIEW public\.strata_okr_objective_exceptions/);
    // backfill is scoped to non-terminal statuses only (closed frozen, never touched)
    const backfillScopes = SQL.match(/status IN \('draft','submitted','active','closing_review'\)/g) ?? [];
    expect(backfillScopes.length).toBeGreaterThanOrEqual(3); // Method A, Method B, exceptions
    expect(SQL).not.toMatch(/UPDATE public\.strata_okrs[\s\S]*status IN \([^)]*'closed'/);
    // exceptions are explicit + never auto-assigned
    expect(SQL).toMatch(/is_exception, reason[\s\S]*requires human Objective/);
  });

  it('validator now requires an Objective alongside the Theme', () => {
    expect(SQL).toMatch(/FUNCTION public\.strata_okr_validate/);
    expect(SQL).toMatch(/o\.objective_id IS NULL THEN codes := array_append\(codes, 'MISSING_OBJECTIVE'\)/);
    expect(SQL).toContain("array_append(codes, 'INVALID_OBJECTIVE')");
  });

  it('provides an Objective-owned create RPC that rejects a non-objective element', () => {
    expect(SQL).toContain('FUNCTION public.strata_create_okr_v3');
    expect(SQL).toMatch(/v_obj\.element_type <> 'objective'[\s\S]*INVALID_OBJECTIVE/);
    // theme is derived + locked from the objective's parent, not passed in
    expect(SQL).toMatch(/SELECT id INTO v_theme FROM public\.strata_strategy_elements WHERE id = v_obj\.parent_id AND element_type='theme'/);
    expect(SQL).toMatch(/INSERT INTO public\.strata_okrs[\s\S]*objective_id, theme_id/);
  });

  it('deprecates the Theme-owned create (v2) without deleting it (Stage 6 removal)', () => {
    expect(SQL).toMatch(/COMMENT ON FUNCTION public\.strata_create_okr_v2[\s\S]*DEPRECATED/);
  });
});
