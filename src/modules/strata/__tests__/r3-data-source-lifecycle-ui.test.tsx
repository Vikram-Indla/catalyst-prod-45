/**
 * R3 — data-source lifecycle UI (capability 6/8).
 *
 * The DB half is proven by probe (06_VALIDATION_EVIDENCE.md): retirement is refused while an
 * approved KPI is fed by the source, suspension is deliberately ungated, and historical lineage is
 * preserved. This pins the UI's obligations:
 *   - offer only transitions the RPC allows (retired is terminal);
 *   - never offer a governed verb to a role the RPC would refuse;
 *   - require a reason for retirement BEFORE the round trip;
 *   - render the blast radius' own `coverage_note` — "no historical impact" is NOT proof a source
 *     was uninvolved, and hiding that would turn an honest lower bound into a false all-clear.
 *
 * tsc proves nothing here (F-11: `npx tsc --noEmit` is a no-op and page property access is
 * unchecked at strict:false). These assertions are the check.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const H = vi.hoisted(() => {
  const src = (id: string, name: string, status: string) => ({
    id, name, status, slug: name.toLowerCase(), system_type: 'excel', owner_id: null,
    refresh_cadence: 'monthly', expected_fields: null, health: null, organization_id: null,
    created_by: null, created_at: '2026-01-01', updated_at: '2026-01-01',
  });
  return {
    ACTIVE: src('s1', 'Salam Finance Excel', 'active'),
    REGISTERED: src('s2', 'New Feed', 'registered'),
    RETIRED: src('s3', 'Old Feed', 'retired'),
    blast: {
      data_source: { id: 's1', name: 'Salam Finance Excel', status: 'active' },
      upload_runs: 1, kpi_actuals_from_source: 8, calculated_values_from_source: 3178,
      blocking: [{ type: 'kpi', id: 'k1', name: 'Churn Rate', status: 'approved',
                   reason: 'an approved KPI is fed by this source; retiring it would stop official reporting for this KPI' }],
      migration: [], historical: [], board_packs_over_affected_snapshots: [],
      can_retire: false,
      coverage_note: 'Derived from upload_run lineage. Manually entered actuals carry no upload_run_id and therefore cannot be traced to a source: absence from `historical` is NOT evidence that this source was uninvolved.',
    },
    dataSourceBlastRadius: vi.fn(),
    setDataSourceStatus: vi.fn(async () => ({})),
    invalidate: vi.fn(),
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});

let ROLES: string[] = ['strategy_office'];

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useDataSources: () => H.ok([H.ACTIVE, H.REGISTERED, H.RETIRED]),
  useProfileNames: () => H.ok(new Map()),
  useUploadRuns: () => H.ok([]),
  useStrataRoles: () => H.ok(ROLES),
  // SC-GOVAPPROVAL: identity hook used by ScorecardLifecycleActions (submit/decide affordances).
  useStrataUserId: () => H.ok('test-user-id'),
  useInvalidateStrata: () => H.invalidate,
  useUploadTemplates: () => H.ok([]),
  useStrataNotifications: () => H.ok([]),
  useStrataRolesLoading: () => false,
  // The page renders inside StrataPageShell, so the shell's own hooks must resolve too.
  useStrataContext: () => ({ periods: [], activePeriod: null, activeCycle: null }),
  useStrataNotificationRules: () => H.ok([]),
  useCycles: () => H.ok([]),
  usePeriods: () => H.ok([]),
}));
vi.mock('@/modules/strata/domain', () => ({
  lineageApi: { dataSourceBlastRadius: H.dataSourceBlastRadius, setDataSourceStatus: H.setDataSourceStatus },
  configApi: {}, scorecardApi: {}, governanceApi: {}, valueApi: {}, kpiApi: {}, strategyApi: {},
}));
vi.mock('./StrataAdminConfigPage', () => ({ UploadTemplatesSection: () => null }));

// The SECTION, not the page: rendering the page drags in the STRATA shell and would prove the
// shell rather than the governed lifecycle. Mirrors how ScorecardModelsSection is tested.
import { SourcesRegistry } from '@/modules/strata/pages/StrataDataIntegrationPage';

const Page = () => <SourcesRegistry onError={() => {}} />;
const q = (id: string) => document.querySelector(`[data-testid="${id}"]`);

describe('R3 UI — only transitions the RPC allows are offered', () => {
  beforeEach(() => { ROLES = ['strategy_office']; H.dataSourceBlastRadius.mockResolvedValue(H.blast); H.setDataSourceStatus.mockClear(); });

  it('an ACTIVE source offers Suspend and Retire — not Activate', () => {
    render(<Page />);
    expect(q('strata-source-suspended-s1')).not.toBeNull();
    expect(q('strata-source-retired-s1')).not.toBeNull();
    expect(q('strata-source-active-s1')).toBeNull();
  });

  it('a REGISTERED source offers Activate — not Suspend (the RPC refuses registered→suspended)', () => {
    render(<Page />);
    expect(q('strata-source-active-s2')).not.toBeNull();
    expect(q('strata-source-suspended-s2')).toBeNull();
  });

  it('a RETIRED source offers NOTHING and says why — retirement is terminal', () => {
    render(<Page />);
    expect(q('strata-source-terminal-s3')).not.toBeNull();
    expect(q('strata-source-retired-s3')).toBeNull();
    expect(q('strata-source-active-s3')).toBeNull();
  });
});

describe('R3 UI — role gate mirrors the RPC', () => {
  beforeEach(() => { ROLES = ['executive_viewer']; });
  it('offers no governed verb to a role the RPC would refuse', () => {
    render(<Page />);
    expect(q('strata-source-suspended-s1')).toBeNull();
    expect(q('strata-source-impact-s1')).toBeNull();
  });
});

describe('R3 UI — dependents impact is shown honestly', () => {
  beforeEach(() => { ROLES = ['strategy_office']; H.dataSourceBlastRadius.mockResolvedValue(H.blast); });

  it('names the blocking KPI rather than counting it', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-source-impact-s1') as HTMLElement);
    await waitFor(() => expect(q('strata-source-blast-radius')).not.toBeNull());
    expect(screen.getByText(/Churn Rate/)).toBeTruthy();
    expect(screen.getByText(/Retirement is blocked by 1 approved KPI/)).toBeTruthy();
  });

  it('renders the coverage_note — absence of historical impact is NOT an all-clear', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-source-impact-s1') as HTMLElement);
    await waitFor(() => expect(q('strata-source-coverage-note')).not.toBeNull());
    expect(q('strata-source-coverage-note')?.textContent).toMatch(/NOT evidence/i);
  });
});

describe('R3 UI — retirement requires a reason before the round trip', () => {
  beforeEach(() => { ROLES = ['strategy_office']; H.setDataSourceStatus.mockClear(); });

  it('blocks Retire with an empty reason and does not call the RPC', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-source-retired-s1') as HTMLElement);
    const confirm = q('strata-source-status-confirm') as HTMLButtonElement;
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(H.setDataSourceStatus).not.toHaveBeenCalled();
  });

  it('SUSPEND does not require a reason — stopping a bad feed must not be gated', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-source-suspended-s1') as HTMLElement);
    expect(q('strata-source-status-confirm')).not.toBeDisabled();
    await user.click(q('strata-source-status-confirm') as HTMLElement);
    await waitFor(() => expect(H.setDataSourceStatus).toHaveBeenCalledWith('s1', 'suspended', undefined));
  });

  it('passes the typed reason to the RPC on retire', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-source-retired-s1') as HTMLElement);
    await user.type(screen.getByLabelText(/Reason/i), '  decommissioned  ');
    await user.click(q('strata-source-status-confirm') as HTMLElement);
    await waitFor(() => expect(H.setDataSourceStatus).toHaveBeenCalledWith('s1', 'retired', 'decommissioned'));
  });
});
