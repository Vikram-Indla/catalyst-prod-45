/**
 * KO-DEF-001 UI — CAT-STRATA-KODEF-20260717-001.
 *
 * The server now refuses an incomplete submission, but the defect is only closed if the user is
 * told BEFORE they try. These tests drive the real StrataKpiDetailPage and prove:
 *   - strata_kpi_submission_blockers is requested for a draft KPI;
 *   - "Submit for approval" is disabled while any blocker remains;
 *   - EVERY returned blocker is visibly rendered (not just the first — the original symptom);
 *   - submission becomes available once the list is empty.
 *
 * The blocker list is mocked at the hook boundary; the SQL itself is covered by
 * kodef001-kpi-submission-gate.guard.test.ts.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const DRAFT_KPI = {
  id: 'kpi-1', slug: 'j-kpi-full-pass', name: 'J KPI Full Pass 20260717-1707',
  status: 'draft', direction: 'higher_better', unit: '%', frequency: 'quarterly',
  entry_method: 'manual', is_strategic: true, lineage_id: 'lin-1', version: 1,
  accountable_owner_id: null, data_owner_id: null, reporter_id: null, validator_id: null,
  escalation_owner_id: null, data_source_id: null, threshold_scheme_id: null, kpi_type_id: null,
};

/** The exact list the staging negative control returned for this KPI. */
const BLOCKERS = [
  'Assign an accountable owner',
  'Assign a data owner',
  'Assign a reporter',
  'Assign a validator',
  'Approve at least one target',
  'Link this Strategic KPI to at least one strategy element (cycle / theme / objective / perspective)',
];

const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });
const blockersSpy = vi.fn();

vi.mock('@/modules/strata/hooks/useStrata', async (orig) => ({
  ...(await orig<typeof import('@/modules/strata/hooks/useStrata')>()),
  useKpiBySlug: () => q(DRAFT_KPI),
  useKpiSubmissionBlockers: (kpiId?: string, enabled?: boolean) => {
    blockersSpy(kpiId, enabled);
    return q(globalThis.__blockers ?? []);
  },
  useKpiDetail: () => q({ targets: [], actuals: [], formulaVersions: [] }),
  useKpiAchievement: () => q(null),
  useKpiEvidenceChain: () => q([]),
  useKpiTypes: () => q([]),
  useDataSources: () => q([]),
  useElementKpis: () => q([]),
  useStrategyElements: () => q([]),
  useThresholdSchemes: () => q([]),
  useUploadRuns: () => q([]),
  useProfileNames: () => q(new Map()),
  useStrataRoles: () => q(['strategy_office']),
  useInvalidateStrata: () => vi.fn(),
  useBandResolver: () => () => null,
  useStrataContext: () => ({ cycles: [], periods: [], activeCycle: null, activePeriod: null }),
}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ slug: 'j-kpi-full-pass' }),
  useNavigate: () => vi.fn(),
}));

import StrataKpiDetailPage from '@/modules/strata/pages/StrataKpiDetailPage';

declare global { // eslint-disable-next-line no-var
  var __blockers: string[] | undefined;
}

const renderPage = () => render(<MemoryRouter><StrataKpiDetailPage /></MemoryRouter>);
const submitBtn = () => screen.getByTestId('strata-kpi-submit');

beforeEach(() => { blockersSpy.mockClear(); globalThis.__blockers = undefined; });

describe('KO-DEF-001 UI — blockers are requested and shown before submission', () => {
  it('requests the blocker list for the draft KPI', () => {
    globalThis.__blockers = BLOCKERS;
    renderPage();
    // Same RPC the submit gate enforces — asked for this KPI, enabled because it is a draft.
    expect(blockersSpy).toHaveBeenCalled();
    expect(blockersSpy.mock.calls[0][0]).toBe('kpi-1');
    expect(blockersSpy.mock.calls[0][1]).toBe(true);
  });

  it('disables Submit for approval while blockers remain', () => {
    globalThis.__blockers = BLOCKERS;
    renderPage();
    expect(submitBtn()).toBeDisabled();
  });

  it('renders EVERY blocker, not just the first', () => {
    globalThis.__blockers = BLOCKERS;
    renderPage();
    const list = screen.getByTestId('strata-kpi-submit-blockers');
    for (const b of BLOCKERS) {
      expect(within(list).getByText(b), `blocker not shown: ${b}`).toBeTruthy();
    }
    expect(within(list).getAllByRole('listitem')).toHaveLength(BLOCKERS.length);
    // The count must match the list — the defect was a single reported failure.
    expect(screen.getByText(/6 prerequisites outstanding/i)).toBeTruthy();
  });

  it('enables Submit and hides the list once no blockers remain', () => {
    globalThis.__blockers = [];
    renderPage();
    expect(submitBtn()).not.toBeDisabled();
    expect(screen.queryByTestId('strata-kpi-submit-blockers')).toBeNull();
  });

  it('singularises the heading for a single blocker', () => {
    globalThis.__blockers = ['Assign a validator'];
    renderPage();
    expect(screen.getByText(/1 prerequisite outstanding/i)).toBeTruthy();
    expect(submitBtn()).toBeDisabled();
  });
});
