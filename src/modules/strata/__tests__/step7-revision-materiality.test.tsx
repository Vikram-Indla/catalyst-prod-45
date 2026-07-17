/**
 * Step 7 (F-9) — revision materiality, CONSUMER rule.
 *
 * The DB half is already proven by probe (06_VALIDATION_EVIDENCE.md): a material revision whose
 * effective version has no eligible actual returns Missing rather than carrying v1's value forward.
 * This pins the DISPLAY half:
 *   material     ⇒ show a methodology break; do not imply comparability
 *   non_material ⇒ continuous trend permitted, WITH exact provenance
 *
 * Tested against the SHARED rule (domain/materiality) rather than through a page render, because the
 * rule is shared by design — KPI detail is the first caller, scorecard detail and board packs follow
 * (F-3 requires the qualification wherever the numbers appear). Testing it here tests it for all of
 * them; testing it through one page would only ever prove that page.
 *
 * NOTE ON TYPES: `npx tsc --noEmit` is a NO-OP in this repo (root tsconfig is a solution config with
 * `files: []` + project references), so it proves nothing about this code. These assertions are the
 * check. See 09_DECISIONS.md → F-11.
 */
import { describe, expect, it } from 'vitest';
import { methodologyBreaks } from '@/modules/strata/domain/materiality';
import type { MaterialityPoint } from '@/modules/strata/domain/materiality';

/** v1 owns Q1, v2 owns Q2 — facts are never repointed, so ownership is read from the row's kpi_id. */
const pt = (version: number | null, revisionClass: string | null, label: string): MaterialityPoint =>
  ({ kpiVersion: version, revisionClass, label });

describe('Step 7 — material revisions break comparability and must say so', () => {
  it('reports a break where a material revision changes the version mid-trend', () => {
    const breaks = methodologyBreaks([
      pt(1, null, 'Q1 FY2026'),
      pt(2, 'material', 'Q2 FY2026'),
    ]);
    expect(breaks).toHaveLength(1);
    // it must name WHICH version and FROM WHERE — a bare warning is not provenance
    expect(breaks[0]).toEqual({ version: 2, label: 'Q2 FY2026' });
  });

  it('reports EVERY break when a lineage was revised materially more than once', () => {
    const breaks = methodologyBreaks([
      pt(1, null, 'Q1'), pt(2, 'material', 'Q2'), pt(3, 'material', 'Q3'),
    ]);
    expect(breaks.map((b) => b.version)).toEqual([2, 3]);
  });
});

describe('Step 7 — non_material continuity is permitted', () => {
  it('reports NO break for a non_material revision — the ruling permits continuous display', () => {
    // Positive control for the rule itself: the SAME version change, differing ONLY in
    // revision_class, must not warn. If both warned, the band would be meaningless noise.
    expect(methodologyBreaks([
      pt(1, null, 'Q1 FY2026'),
      pt(2, 'non_material', 'Q2 FY2026'),
    ])).toEqual([]);
  });

  it('reports no break within a single version', () => {
    expect(methodologyBreaks([pt(1, null, 'Q1'), pt(1, null, 'Q2'), pt(1, null, 'Q3')])).toEqual([]);
  });

  it('breaks only at the boundary, not on every later point of the material version', () => {
    const breaks = methodologyBreaks([
      pt(1, null, 'Q1'), pt(2, 'material', 'Q2'), pt(2, 'material', 'Q3'), pt(2, 'material', 'Q4'),
    ]);
    expect(breaks).toHaveLength(1);
    expect(breaks[0].label).toBe('Q2');
  });
});

describe('Step 7 — zero-assumption on unknown provenance', () => {
  it('never asserts a break when a point\'s version is unknown', () => {
    // An unknown version is not evidence of a break. Claiming one would be as wrong as hiding one.
    expect(methodologyBreaks([pt(null, null, 'Q1'), pt(2, 'material', 'Q2')])).toEqual([]);
    expect(methodologyBreaks([pt(1, null, 'Q1'), pt(null, 'material', 'Q2')])).toEqual([]);
  });

  it('treats revision_class NULL as "not a revision", never as "unclassified"', () => {
    // The DB CHECK guarantees a revision is always classified (supersedes_id IS NULL OR
    // revision_class IS NOT NULL), so NULL here can only mean "not a revision".
    expect(methodologyBreaks([pt(1, null, 'Q1'), pt(2, null, 'Q2')])).toEqual([]);
  });

  it('handles an empty and single-point trend without inventing a break', () => {
    expect(methodologyBreaks([])).toEqual([]);
    expect(methodologyBreaks([pt(2, 'material', 'Q2')])).toEqual([]);
  });
});
