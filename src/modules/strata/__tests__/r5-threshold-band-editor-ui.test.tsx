/**
 * R5 — threshold band-editor authoring UI (capability 1).
 *
 * The DB half was probed on staging 2026-07-17, and these assertions pin the UI to what was found
 * there — not to what a band editor "ought" to do:
 *
 *   - RLS `strata_threshold_schemes_update` allows the write only while
 *     `status = 'draft' AND (created_by = auth.uid() OR strata_is_admin())`. That gate is
 *     AUTHORSHIP-based; it is NOT the strategy_office role gate the revision RPC uses. A
 *     strategy_office user who did not author the draft is refused, so the control must not appear
 *     for them.
 *   - An UPDATE filtered out by RLS matches zero rows and raises NO error. The domain layer reads
 *     the rows back and turns that silence into a refusal; a save must never be reported as
 *     succeeding on zero rows.
 *   - The ONLY DB check on the column is `jsonb_typeof(bands) = 'array'`. Ordering, coverage,
 *     non-overlap, unique keys and unique floors are NOT enforced. So the editor blocks only what
 *     makes a band unconstructable, and treats a duplicate floor as a saveable advisory.
 *   - `strata_band_from_score()` rates by `min_score <= score ORDER BY min_score DESC LIMIT 1`.
 *     Bands are floors; there is no stored upper bound.
 *
 * tsc proves nothing here (F-11: `npx tsc --noEmit` is a no-op repo-wide). These assertions are
 * the check. The SECTION is rendered, never the page — rendering the page would prove the shell.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const H = vi.hoisted(() => {
  const scheme = (over: Record<string, unknown> = {}) => ({
    id: 'sch-1', name: 'Salam Standard RAG', slug: 'salam-standard-rag', description: null,
    // The real staging shape — floors only, no `max`.
    bands: [
      { key: 'green', label: 'On track', min_score: 85, appearance: 'success' },
      { key: 'amber', label: 'Watch', min_score: 60, appearance: 'moved' },
      { key: 'red', label: 'At risk', min_score: 0, appearance: 'removed' },
    ],
    tolerance: 5, confidence_threshold: 0.7,
    version: 1, status: 'approved', effective_from: '2026-01-01', effective_to: null,
    approved_by: 'u-other', approved_at: '2026-01-02', change_reason: null, supersedes_id: null,
    created_by: 'u-me', created_at: '2026-01-01', updated_at: '2026-01-01',
    ...over,
  });
  return {
    scheme,
    updateThresholdBands: vi.fn(async () => ({})),
    createThresholdDraftVersion: vi.fn(async () => 'sch-2'),
    invalidate: vi.fn(),
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});

let SCHEMES: ReturnType<typeof H.scheme>[] = [];
let ROLES: string[] = ['strata_admin'];
let USER_ID: string | null = 'u-me';

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useThresholdSchemes: () => H.ok(SCHEMES),
  useStrataRoles: () => H.ok(ROLES),
  useStrataUserId: () => H.ok(USER_ID),
  useInvalidateStrata: () => H.invalidate,
  // CFG-004: ThresholdsSection now reads KPIs to show scheme dependents.
  useKpis: () => H.ok([]),
}));

vi.mock('@/modules/strata/domain', () => ({
  configApi: {
    updateThresholdBands: H.updateThresholdBands,
    createThresholdDraftVersion: H.createThresholdDraftVersion,
    createModelDraftVersion: vi.fn(),
    submitRecord: vi.fn(),
    approveRecord: vi.fn(),
    retireRecord: vi.fn(),
    approveScorecardModel: vi.fn(),
  },
  governanceApi: {},
  scorecardApi: {},
}));

import { ThresholdsSection, bandDraftToPayload } from '@/modules/strata/pages/StrataAdminConfigPage';

const renderSection = () => render(<ThresholdsSection onError={vi.fn()} />);

beforeEach(() => {
  vi.clearAllMocks();
  SCHEMES = [H.scheme()];
  ROLES = ['strata_admin'];
  USER_ID = 'u-me';
  H.updateThresholdBands.mockResolvedValue({});
});

describe('R5 — approved schemes are immutable', () => {
  it('offers NO edit control on an approved scheme, and says why', () => {
    renderSection();
    expect(screen.queryByTestId('strata-band-edit-sch-1')).toBeNull();
    expect(screen.getByTestId('strata-band-noedit-sch-1').textContent)
      .toContain('immutable');
  });

  it('routes an approved scheme to the revision RPC instead — the shipped CTA, not a new mechanism', async () => {
    const user = userEvent.setup();
    renderSection();
    // GovActions renders this for approved records that have a REVISION_RPC entry.
    await user.click(screen.getByTestId('strata-model-new-version-sch-1'));
    await user.type(screen.getByLabelText('Reason for the new version'), 'tighten the amber floor');
    await user.click(screen.getByRole('button', { name: 'Create draft version' }));
    await waitFor(() => {
      expect(H.createThresholdDraftVersion).toHaveBeenCalledWith('sch-1', 'tighten the amber floor');
    });
    // The bands themselves were never written.
    expect(H.updateThresholdBands).not.toHaveBeenCalled();
  });

  it('offers no edit control on a retired or superseded scheme either', () => {
    SCHEMES = [H.scheme({ status: 'retired' })];
    renderSection();
    expect(screen.queryByTestId('strata-band-edit-sch-1')).toBeNull();
  });
});

describe('R5 — a draft IS editable', () => {
  it('offers the edit control on a draft authored by the current user', async () => {
    SCHEMES = [H.scheme({ status: 'draft', created_by: 'u-me' })];
    USER_ID = 'u-me';
    ROLES = [];
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId('strata-band-edit-sch-1'));
    expect(screen.getByTestId('strata-band-editor-sch-1')).toBeTruthy();
  });

  it('saves the edited bands through the RLS-gated write path', async () => {
    SCHEMES = [H.scheme({ status: 'draft', created_by: 'u-me' })];
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId('strata-band-edit-sch-1'));
    // Rows are ordered by floor desc, so row 0 is green@85.
    const floor = screen.getByTestId('strata-band-min-0');
    await user.clear(floor);
    await user.type(floor, '90');
    await user.click(screen.getByTestId('strata-band-save-sch-1'));
    await waitFor(() => expect(H.updateThresholdBands).toHaveBeenCalled());
    const [id, bands] = H.updateThresholdBands.mock.calls[0];
    expect(id).toBe('sch-1');
    expect(bands[0]).toEqual({ key: 'green', label: 'On track', min_score: 90, appearance: 'success' });
    // No invented `max` key — the DB has no upper bound on a band.
    expect(Object.keys(bands[0]).sort()).toEqual(['appearance', 'key', 'label', 'min_score']);
  });
});

describe('R5 — the role gate mirrors the rule actually in force', () => {
  it('hides the control from a strategy_office user who did not author the draft', () => {
    // The revision RPC would accept this user; the RLS UPDATE would NOT. The band editor must
    // mirror the UPDATE policy, which is the rule governing this write.
    SCHEMES = [H.scheme({ status: 'draft', created_by: 'someone-else' })];
    USER_ID = 'u-me';
    ROLES = ['strategy_office'];
    renderSection();
    expect(screen.queryByTestId('strata-band-edit-sch-1')).toBeNull();
    expect(screen.getByTestId('strata-band-noedit-sch-1').textContent)
      .toContain('author or a strata_admin');
  });

  it('shows the control to a strata_admin who did not author the draft', () => {
    SCHEMES = [H.scheme({ status: 'draft', created_by: 'someone-else' })];
    USER_ID = 'u-me';
    ROLES = ['strata_admin'];
    renderSection();
    expect(screen.queryByTestId('strata-band-edit-sch-1')).toBeTruthy();
  });
});

describe('R5 — server refusals surface verbatim', () => {
  it('renders the refusal text exactly as thrown, and does not report success', async () => {
    SCHEMES = [H.scheme({ status: 'draft', created_by: 'u-me' })];
    const raw = 'new row violates row-level security policy for table "strata_threshold_schemes"';
    H.updateThresholdBands.mockRejectedValue(new Error(raw));
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId('strata-band-edit-sch-1'));
    await user.click(screen.getByTestId('strata-band-save-sch-1'));
    await waitFor(() => expect(screen.getByText(raw)).toBeTruthy());
    // Still editing — a refused save must not close the editor as though it worked.
    expect(screen.getByTestId('strata-band-editor-sch-1')).toBeTruthy();
    expect(H.invalidate).not.toHaveBeenCalled();
  });
});

describe('R5 — validation mirrors the DB, and invents nothing', () => {
  it('blocks only what makes a band unconstructable', () => {
    const r = bandDraftToPayload([
      { rowId: 'a', key: '', label: 'On track', minScore: '85', appearance: 'success' },
      { rowId: 'b', key: 'amber', label: '', minScore: 'abc', appearance: null },
    ]);
    expect(r.blocked.some((b) => b.includes('band key is required'))).toBe(true);
    expect(r.blocked.some((b) => b.includes('band label is required'))).toBe(true);
    expect(r.blocked.some((b) => b.includes('must be a number'))).toBe(true);
  });

  it('blocks duplicate keys — a rated KPI stores only the key', () => {
    const r = bandDraftToPayload([
      { rowId: 'a', key: 'green', label: 'On track', minScore: '85', appearance: null },
      { rowId: 'b', key: 'green', label: 'Also green', minScore: '60', appearance: null },
    ]);
    expect(r.blocked.some((b) => b.includes('share the key'))).toBe(true);
  });

  it('does NOT block a gap, an unordered list, or a missing zero floor — the DB enforces none of them', () => {
    const r = bandDraftToPayload([
      { rowId: 'a', key: 'red', label: 'At risk', minScore: '40', appearance: null },
      { rowId: 'b', key: 'green', label: 'On track', minScore: '85', appearance: null },
    ]);
    expect(r.blocked).toEqual([]);
    expect(r.advisories).toEqual([]);
  });

  it('treats a duplicate floor as a saveable advisory, not a block — the DB accepts it', () => {
    const r = bandDraftToPayload([
      { rowId: 'a', key: 'green', label: 'On track', minScore: '60', appearance: null },
      { rowId: 'b', key: 'amber', label: 'Watch', minScore: '60', appearance: null },
    ]);
    expect(r.blocked).toEqual([]);
    expect(r.advisories.some((a) => a.includes('not determined'))).toBe(true);
  });

  it('leaves an unset appearance unset rather than defaulting it to a colour', () => {
    const r = bandDraftToPayload([
      { rowId: 'a', key: 'green', label: 'On track', minScore: '85', appearance: null },
    ]);
    expect(r.bands[0]).toEqual({ key: 'green', label: 'On track', min_score: 85 });
    expect('appearance' in r.bands[0]).toBe(false);
  });

  it('blocks an empty scheme — it could never rate anything', () => {
    expect(bandDraftToPayload([]).blocked.some((b) => b.includes('no bands'))).toBe(true);
  });
});
