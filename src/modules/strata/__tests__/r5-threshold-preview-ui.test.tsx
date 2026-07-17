/**
 * R5 — threshold-scheme preview-with-data (capability 3).
 *
 * The DB half was probed on staging 2026-07-17 and these assertions pin the UI to what was found
 * there, not to what a preview "ought" to do:
 *
 *   - strata_preview_threshold_scheme(p_scheme, p_bands) is STABLE and writes NOTHING — not even an
 *     audit event. Proven in-DB: calculated_values 7640->7640, audit_events 2163->2163 across a full
 *     probe run, and Postgres itself refuses an INSERT inside a STABLE function.
 *   - It NAMES the movers (blast_radius precedent) and caps the naming at 500, reporting the
 *     overflow via moves_not_named rather than truncating silently. Real staging run: 908 movers =>
 *     moves_named 500, moves_not_named 408.
 *   - ⚠️ THE RESULT IS A COUNTERFACTUAL, NOT A CHANGELOG. Saving bands does not re-rate any listed
 *     row: status_key is written once, at calculation time, so new bands govern FUTURE calculations
 *     only and locked snapshots never re-rate (D-1). The wording guard below exists because calling
 *     these rows "rows that will change" is the single most tempting lie this panel could tell.
 *   - coverage_note is the server's own statement of its limits (443 values carry no
 *     threshold_scheme_id; 40 have no score). It is rendered VERBATIM — re-wording it softens it.
 *
 * tsc proves nothing here (F-11: the root tsconfig is files:[] + references, so `tsc --noEmit` is a
 * no-op repo-wide). These assertions are the check. The SECTION is rendered, never the page.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const H = vi.hoisted(() => {
  const CURRENT = [
    { key: 'green', label: 'On track', min_score: 85, appearance: 'success' },
    { key: 'amber', label: 'Watch', min_score: 60, appearance: 'moved' },
    { key: 'red', label: 'At risk', min_score: 0, appearance: 'removed' },
  ];
  // The candidate the staging probe actually used: green floor 85 -> 95.
  const CANDIDATE = [
    { key: 'green', label: 'On track', min_score: 95, appearance: 'success' },
    { key: 'amber', label: 'Watch', min_score: 60, appearance: 'moved' },
    { key: 'red', label: 'At risk', min_score: 0, appearance: 'removed' },
  ];
  const scheme = (over: Record<string, unknown> = {}) => ({
    id: 'sch-1', name: 'Salam Standard RAG', slug: 'salam-standard-rag', description: null,
    bands: CURRENT,
    tolerance: 5, confidence_threshold: 0.7,
    version: 1, status: 'draft', effective_from: '2026-01-01', effective_to: null,
    approved_by: null, approved_at: null, change_reason: null, supersedes_id: null,
    created_by: 'u-me', created_at: '2026-01-01', updated_at: '2026-01-01',
    ...over,
  });
  // Shaped from the real RPC payload observed on staging.
  const preview = (over: Record<string, unknown> = {}) => ({
    scheme: { id: 'sch-1', name: 'Salam Standard RAG', status: 'draft', version: 1 },
    current_bands: CURRENT,
    candidate_bands: CANDIDATE,
    evaluated: 7157,
    moved_count: 2,
    moves: [
      {
        entity_type: 'kpi', entity_id: 'k-1', entity_name: 'Net Promoter Score',
        period_id: 'p-1', period_name: 'Q1 FY2026', metric_key: 'achievement_pct',
        value: 93.548, score: 93.548, band_today: 'green', band_candidate: 'amber',
        in_locked_snapshot: false,
      },
      {
        entity_type: 'scorecard_line', entity_id: 'sl-9', entity_name: null,
        period_id: null, period_name: null, metric_key: 'score',
        value: null, score: null, band_today: 'green', band_candidate: 'amber',
        in_locked_snapshot: true,
      },
    ],
    moves_named: 2,
    moves_not_named: 0,
    band_distribution: [
      { key: 'amber', count_today: 582, count_candidate: 1490 },
      { key: 'green', count_today: 6574, count_candidate: 5666 },
      { key: 'red', count_today: 1, count_candidate: 1 },
    ],
    moves_in_locked_snapshots: 0,
    stored_status_drift: 0,
    not_visible: { values_with_no_scheme_in_provenance: 443, values_for_this_scheme_with_no_score: 40 },
    coverage_note:
      'This preview re-rates the scores ALREADY stored for this scheme against the candidate bands. '
      + 'Absence from `moves` is not evidence that a value does not move.',
    ...over,
  });
  return { scheme, preview, CURRENT, CANDIDATE, previewThresholdScheme: vi.fn() };
});

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useThresholdSchemes: () => ({ data: [], isLoading: false, isError: false, error: null }),
  useStrataRoles: () => ({ data: ['strata_admin'], isLoading: false, isError: false, error: null }),
  useStrataUserId: () => ({ data: 'u-me', isLoading: false, isError: false, error: null }),
  useInvalidateStrata: () => vi.fn(),
}));

vi.mock('@/modules/strata/domain', () => ({
  configApi: { previewThresholdScheme: H.previewThresholdScheme },
  governanceApi: {},
  scorecardApi: {},
}));

import { ThresholdPreviewPanel } from '@/modules/strata/pages/StrataAdminConfigPage';

const renderPanel = (over: Record<string, unknown> = {}) =>
  render(<ThresholdPreviewPanel scheme={H.scheme() as never} bands={H.CANDIDATE as never} {...over} />);

const runPreview = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByTestId('strata-preview-run-sch-1'));
  await waitFor(() => expect(screen.getByTestId('strata-preview-result')).toBeTruthy());
};

beforeEach(() => {
  vi.clearAllMocks();
  H.previewThresholdScheme.mockResolvedValue(H.preview());
});

describe('R5 preview — asks the server about the CANDIDATE bands', () => {
  it('sends the candidate bands being edited, not the scheme’s saved bands', async () => {
    renderPanel();
    await runPreview();
    // The whole point of preview-with-data: the unsaved candidate is the subject.
    expect(H.previewThresholdScheme).toHaveBeenCalledWith('sch-1', H.CANDIDATE);
    expect(H.previewThresholdScheme).not.toHaveBeenCalledWith('sch-1', H.CURRENT);
  });

  it('does not preview until asked — a preview is a question, and questions are asked deliberately', () => {
    renderPanel();
    expect(H.previewThresholdScheme).not.toHaveBeenCalled();
    expect(screen.queryByTestId('strata-preview-result')).toBeNull();
  });
});

describe('R5 preview — names the movement, never just counts it', () => {
  it('names the KPI that moves and shows its band today AND under the candidate', async () => {
    renderPanel();
    await runPreview();
    // Named, the way blast_radius names blockers — a decision needs to know WHICH.
    expect(screen.getByText('Net Promoter Score')).toBeTruthy();
    expect(screen.getByText('Q1 FY2026')).toBeTruthy();
    // Both sides of the transition are shown, using each band set's own label.
    expect(screen.getAllByText('On track').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Watch').length).toBeGreaterThan(0);
  });

  it('shows the band populations before and after, with a signed change', async () => {
    renderPanel();
    await runPreview();
    expect(screen.getByText('6574')).toBeTruthy();
    expect(screen.getByText('5666')).toBeTruthy();
    expect(screen.getByText('-908')).toBeTruthy();
    expect(screen.getByText('+908')).toBeTruthy();
  });

  it('declares the naming cap’s overflow rather than truncating in silence', async () => {
    H.previewThresholdScheme.mockResolvedValue(H.preview({ moved_count: 908, moves_named: 500, moves_not_named: 408 }));
    renderPanel();
    await runPreview();
    expect(document.body.textContent).toContain('500 of 908 are listed above');
    expect(document.body.textContent).toContain('408');
  });

  it('says nothing about an overflow when everything is named', async () => {
    renderPanel();
    await runPreview();
    expect(screen.queryByText(/Not every mover is listed/)).toBeNull();
  });
});

describe('R5 preview — the counterfactual is not sold as a changelog', () => {
  it('never claims the listed values will change when the bands are saved', async () => {
    renderPanel();
    await runPreview();
    const text = document.body.textContent ?? '';
    // The lie this panel is most tempted to tell. Saving re-rates NOTHING listed here.
    expect(text).not.toMatch(/will change/i);
    expect(text).not.toMatch(/will be re-?rated/i);
    expect(text).toMatch(/would be rated differently/i);
    expect(text).toMatch(/not re-rated by saving/i);
  });

  it('reports locked-snapshot movers as informational, not as a blocker', async () => {
    H.previewThresholdScheme.mockResolvedValue(H.preview({ moves_in_locked_snapshots: 16 }));
    renderPanel();
    await runPreview();
    expect(document.body.textContent).toContain('16 of these values sit in locked snapshots');
    expect(document.body.textContent).toMatch(/never re-rated/i);
    // The preview never gates saving — it informs it.
    expect(screen.queryByText(/cannot save/i)).toBeNull();
  });

  it('states plainly when nothing moves, instead of an empty table', async () => {
    H.previewThresholdScheme.mockResolvedValue(H.preview({ moved_count: 0, moves: [], moves_named: 0 }));
    renderPanel();
    await runPreview();
    expect(screen.getByTestId('strata-preview-summary').textContent)
      .toContain('No change: all 7157 rated values keep the same band');
  });

  it('surfaces stored drift instead of letting a recompute quietly stand in for what is stored', async () => {
    H.previewThresholdScheme.mockResolvedValue(H.preview({ stored_status_drift: 7 }));
    renderPanel();
    await runPreview();
    expect(document.body.textContent).toContain('7 stored values already carry a rating');
  });
});

describe('R5 preview — coverage limit is rendered verbatim', () => {
  it('renders the server’s coverage_note exactly, not a paraphrase', async () => {
    renderPanel();
    await runPreview();
    expect(screen.getByTestId('strata-preview-coverage').textContent)
      .toBe(H.preview().coverage_note);
    expect(screen.getByTestId('strata-preview-coverage').textContent)
      .toContain('Absence from `moves` is not evidence');
  });
});

describe('R5 preview — zero-assumption rendering', () => {
  it('renders a dash for an entity it cannot name and a score it does not have', async () => {
    renderPanel();
    await runPreview();
    // The scorecard_line row has entity_name null, period null and score null. None may be invented,
    // and a null score must never render as 0 — 0 is a real score.
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
    expect(document.body.textContent).not.toContain('Unknown');
    expect(document.body.textContent).not.toContain('N/A');
  });

  it('labels the unnamed row by its type rather than guessing an identity', async () => {
    renderPanel();
    await runPreview();
    expect(screen.getByText(/Scorecard line/i)).toBeTruthy();
  });
});

describe('R5 preview — refusals are surfaced verbatim', () => {
  it('shows the server’s own rejection text, unre-worded', async () => {
    H.previewThresholdScheme.mockRejectedValue(
      new Error('Candidate bands must contain at least one band — with none, every score rates as no band at all.'),
    );
    renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('strata-preview-run-sch-1'));
    await waitFor(() => expect(screen.getByText(/Preview rejected/)).toBeTruthy());
    expect(document.body.textContent).toContain('must contain at least one band');
    expect(screen.queryByTestId('strata-preview-result')).toBeNull();
  });

  it('drops a stale result when a later preview is refused', async () => {
    renderPanel();
    await runPreview();
    expect(screen.getByTestId('strata-preview-result')).toBeTruthy();
    H.previewThresholdScheme.mockRejectedValue(new Error('Not authorized to preview threshold schemes.'));
    const user = userEvent.setup();
    await user.click(screen.getByTestId('strata-preview-run-sch-1'));
    // A refusal must not leave the previous answer on screen looking current.
    await waitFor(() => expect(screen.queryByTestId('strata-preview-result')).toBeNull());
    expect(document.body.textContent).toContain('Not authorized');
  });
});

describe('R5 preview — no hand-rolled RAG colour', () => {
  it('renders bands through the ADS lozenge, carrying no local colour map', async () => {
    const { container } = renderPanel();
    await runPreview();
    // A local RAG_COLORS map is explicitly banned: the component owns the colour. If any element
    // carried a literal red/amber/green, this would catch it.
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(container.innerHTML).not.toMatch(/rgba?\(/);
    expect(container.innerHTML).not.toMatch(/\b(red|green|orange|amber|yellow)\b\s*;/);
  });
});
