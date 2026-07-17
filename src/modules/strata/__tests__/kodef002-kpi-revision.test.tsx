/**
 * KO-DEF-002 — governed prospective KPI revision. CAT-STRATA-KODEF-20260717-001.
 *
 * An Approved KPI had no reachable revision action: strata_create_kpi_draft_version has existed
 * since 20260716240000, but the UI's REVISION_RPC map (StrataAdminConfigPage) is shaped
 * (id, reason) with no slot for the mandatory revision class, and its comment still claimed the
 * work was "blocked on F-9" — which later migrations had already delivered.
 *
 * SCOPE: revision only. Prospective retirement is NOT implemented (no strata_retire_kpi exists);
 * no unguarded retirement affordance is shipped here.
 *
 * Split in two:
 *  - UI: the action is reachable on an Approved KPI and collects reason + materiality.
 *  - Guard: the SQL guarantees the brief actually turns on — lineage, version, supersedes,
 *    definition-children-only, predecessor immutability.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ── UI ───────────────────────────────────────────────────────────────────────
const APPROVED_KPI = {
  id: 'kpi-v1', slug: 'revenue-assurance-rate', name: 'Revenue Assurance Rate',
  status: 'approved', direction: 'higher_better', unit: '%', frequency: 'quarterly',
  entry_method: 'manual', is_strategic: true, lineage_id: 'lin-1', version: 1,
  accountable_owner_id: 'u1', data_owner_id: 'u1', reporter_id: 'u1', validator_id: 'u2',
  escalation_owner_id: null, data_source_id: null, threshold_scheme_id: null, kpi_type_id: null,
};

const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });
// vi.mock factories are hoisted above module-scope consts — the spy must be created inside
// vi.hoisted or the factory dereferences it before initialization.
const { createDraftVersion } = vi.hoisted(() => ({ createDraftVersion: vi.fn() }));

vi.mock('@/modules/strata/domain', async (orig) => {
  const actual = await orig<typeof import('@/modules/strata/domain')>();
  return { ...actual, configApi: { ...actual.configApi, createKpiDraftVersion: createDraftVersion } };
});

vi.mock('@/modules/strata/hooks/useStrata', async (orig) => ({
  ...(await orig<typeof import('@/modules/strata/hooks/useStrata')>()),
  useKpiBySlug: () => q(globalThis.__kpi ?? APPROVED_KPI),
  useKpiSubmissionBlockers: () => q([]),
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
  useParams: () => ({ slug: 'revenue-assurance-rate' }),
  useNavigate: () => vi.fn(),
}));

import StrataKpiDetailPage from '@/modules/strata/pages/StrataKpiDetailPage';

declare global { // eslint-disable-next-line no-var
  var __kpi: Record<string, unknown> | undefined;
}

vi.setConfig({ testTimeout: 30_000 });

const renderPage = () => render(<MemoryRouter><StrataKpiDetailPage /></MemoryRouter>);

beforeEach(() => {
  createDraftVersion.mockReset();
  createDraftVersion.mockResolvedValue('kpi-v2');
  globalThis.__kpi = undefined;
});

describe('KO-DEF-002 UI — revision is reachable on an Approved KPI', () => {
  it('offers Create new version on an Approved KPI', () => {
    renderPage();
    expect(screen.getByTestId('strata-kpi-new-version')).toBeTruthy();
  });

  it('does NOT offer it on a Draft (a draft is edited in place, not versioned)', () => {
    globalThis.__kpi = { ...APPROVED_KPI, status: 'draft' };
    renderPage();
    expect(screen.queryByTestId('strata-kpi-new-version')).toBeNull();
  });

  it('states that the predecessor stays Approved and keeps its facts', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await user.click(screen.getByTestId('strata-kpi-new-version'));
    expect(screen.getByText(/v1 stays Approved and unchanged/i)).toBeTruthy();
    expect(screen.getByText(/keeps every\s+actual, target and historical fact/i)).toBeTruthy();
  });

  it('requires a reason and a materiality before it will submit', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await user.click(screen.getByTestId('strata-kpi-new-version'));
    await user.click(screen.getByRole('button', { name: 'Create draft version' }));
    // Both are mandatory server-side; the modal must not spend a round-trip to learn that.
    expect(screen.getByText(/Required: Change reason, Materiality/)).toBeTruthy();
    expect(createDraftVersion).not.toHaveBeenCalled();
  });

  it('passes the KPI id, reason and materiality to the existing RPC', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await user.click(screen.getByTestId('strata-kpi-new-version'));
    await user.type(screen.getByLabelText('Change reason', { exact: false }), 'Formula corrected');
    const select = screen.getByLabelText('Materiality', { exact: false });
    await user.click(select);
    await user.click(await screen.findByText(/^Material —/));
    await user.click(screen.getByRole('button', { name: 'Create draft version' }));
    expect(createDraftVersion).toHaveBeenCalledWith('kpi-v1', 'Formula corrected', 'material');
  });
});

// ── Server guard ─────────────────────────────────────────────────────────────
const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const corpus = files.map((f) => ({ f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));

function latestBody(fn: string) {
  const re = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${fn}\\s*\\(`, 'i');
  const defining = corpus.filter(({ sql }) => re.test(sql));
  expect(defining.length, `no migration defines ${fn}`).toBeGreaterThan(0);
  const last = defining[defining.length - 1];
  const starts = [...last.sql.matchAll(new RegExp(re.source, 'gi'))].map((m) => m.index ?? -1);
  const start = starts[starts.length - 1];
  const end = last.sql.indexOf('$function$;', start);
  return { file: last.f, body: last.sql.slice(start, end) };
}

describe('KO-DEF-002 server — the guarantees the UI action relies on', () => {
  it('requires reason and a valid revision class', () => {
    const { body } = latestBody('strata_create_kpi_draft_version');
    expect(body).toMatch(/p_reason IS NULL OR btrim\(p_reason\) = ''[\s\S]{0,80}RAISE EXCEPTION/);
    expect(body).toMatch(/p_revision_class NOT IN \('non_material','material'\)/);
  });

  it('keeps the lineage stable, increments version and records supersedes', () => {
    const { body } = latestBody('strata_create_kpi_draft_version');
    expect(body).toContain('v_src.lineage_id');
    expect(body).toMatch(/max\(version\) \+ 1 FROM public\.strata_kpis WHERE lineage_id = v_src\.lineage_id/);
    // supersedes_id <- the source row; change_reason and revision_class are persisted.
    expect(body).toMatch(/p_reason, p_kpi, p_revision_class/);
  });

  it('clones DEFINITION children only — never facts', () => {
    const { body } = latestBody('strata_create_kpi_draft_version');
    // The one legitimate child copy: formula versions, with approval reset.
    expect(body).toMatch(/INSERT INTO public\.strata_kpi_formula_versions/);
    // Facts and relationships must never be copied or repointed.
    for (const table of [
      'strata_kpi_actuals', 'strata_kpi_targets', 'strata_key_results',
      'strata_scorecard_lines', 'strata_element_kpis', 'strata_scorecard_model_measures',
    ]) {
      expect(body, `must not clone ${table}`).not.toMatch(new RegExp(`INSERT INTO public\\.${table}`, 'i'));
      expect(body, `must not repoint ${table}`).not.toMatch(new RegExp(`UPDATE\\s+public\\.${table}`, 'i'));
    }
  });

  it('never mutates the Approved predecessor', () => {
    const { body } = latestBody('strata_create_kpi_draft_version');
    // The whole point of D-3: revise by versioning, never in place.
    expect(body).not.toMatch(/UPDATE\s+public\.strata_kpis/i);
    expect(body).not.toMatch(/DELETE\s+FROM\s+public\.strata_kpis/i);
    // The new row starts unapproved rather than inheriting the predecessor's approval.
    expect(body).toMatch(/'draft'/);
  });

  it('allows only one open successor per lineage', () => {
    const { body } = latestBody('strata_create_kpi_draft_version');
    expect(body).toMatch(/lineage_id = v_src\.lineage_id AND status IN \('draft','pending_approval'\)/);
    expect(body).toMatch(/RAISE EXCEPTION 'a draft version of this KPI already exists/);
  });

  it('refuses to version a draft', () => {
    const { body } = latestBody('strata_create_kpi_draft_version');
    expect(body).toMatch(/v_src\.status = 'draft'[\s\S]{0,120}RAISE EXCEPTION/);
  });
});
