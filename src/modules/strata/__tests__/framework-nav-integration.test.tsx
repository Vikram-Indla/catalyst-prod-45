/**
 * CAT-STRATA-GOVFRAMEWORK — navigation & user-journey integration.
 * Proves the three governed authoring concepts are discoverable from Configuration and
 * navigable without typing a URL: Perspective definitions → Strategy framework → Scorecard
 * models, with correct active state and working navigation (link-out to the standalone
 * framework page + inline :section routes), plus the landing-grid cards.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('@/modules/strata/hooks/useStrata', () => {
  const ok = (data: unknown) => ({ data, isLoading: false, isError: false, error: null });
  return {
    StrataProvider: ({ children }: { children: React.ReactNode }) => children,
    useStrataContext: () => ({ cycles: [], periods: [], activeCycle: null, activePeriod: null }),
    useStrataRoles: () => ok([]), useStrataUserId: () => ok(null), useStrataAudit: () => ok([]),
    useProfileNames: () => ok(new Map()), usePerspectives: () => ok([]), useScorecardModels: () => ok([]),
    useAllModelPerspectives: () => ok([]), useAllModelMeasures: () => ok([]), useModelPerspectives: () => ok([]),
    useKpis: () => ok([]), useKpiTypes: () => ok([]), useThresholdSchemes: () => ok([]),
    useUploadTemplates: () => ok([]), useValueCategories: () => ok([]), useGateModels: () => ok([]),
    useWorkflowConfigs: () => ok([]), useChangeRequests: () => ok([]), useRoleAssignments: () => ok([]),
    useStrataNotificationRules: () => ok([]), useProjectCardFieldConfigs: () => ok([]),
    useProjectCardPicklists: () => ok([]), useProjectCardSectionConfigs: () => ok([]),
    useProjectCardTabConfigs: () => ok([]), useInvalidateStrata: () => vi.fn(),
    useStrataNotifications: () => ok([]), ctxToken: (n: string) => n,
  };
});
vi.mock('@/modules/strata/domain', () => ({ configApi: {}, governanceApi: {}, scorecardApi: {}, strategyApi: {}, valueApi: {} }));

import { DOMAINS, SECTIONS, StrataConfigNav } from '../pages/StrataAdminConfigPage';
import { Routes } from '@/lib/routes';

function Loc() { const l = useLocation(); return <div data-testid="loc">{l.pathname}</div>; }
const renderNav = (activeKey?: string) => render(
  <MemoryRouter initialEntries={['/strata/admin/perspectives']}>
    <StrataConfigNav activeKey={activeKey} />
    <Loc />
  </MemoryRouter>,
);

describe('CAT-STRATA-GOVFRAMEWORK — Configuration nav integration', () => {
  it('the three governed concepts lead the nav in the required order, with corrected labels', () => {
    const keys = SECTIONS.map((s) => s.key);
    expect(keys.indexOf('perspectives')).toBe(0);
    expect(keys.indexOf('frameworks')).toBe(1);
    expect(keys.indexOf('scorecard-models')).toBe(2);
    expect(SECTIONS[0].label).toBe('Perspective definitions');
    expect(SECTIONS[1].label).toBe('Strategy framework');
    expect(SECTIONS[2].label).toBe('Scorecard models');
  });

  it('Strategy framework is a link-out to the standalone framework page (canonical helper, no duplicated string)', () => {
    expect(SECTIONS.find((s) => s.key === 'frameworks')!.to).toBe(Routes.strata.frameworks());
  });

  it('landing grid: Perspective definitions card + a Strategy framework card that routes to the framework page (not perspectives)', () => {
    expect(DOMAINS.find((d) => d.key === 'perspective-definitions')!.to).toBe(Routes.strata.adminSection('perspectives'));
    expect(DOMAINS.find((d) => d.key === 'strategy-framework')!.to).toBe(Routes.strata.frameworks());
  });

  it('renders all three items and marks the active one with aria-current=page', () => {
    renderNav('frameworks');
    expect(screen.getByTestId('strata-admin-nav-perspectives')).toHaveTextContent('Perspective definitions');
    expect(screen.getByTestId('strata-admin-nav-frameworks')).toHaveTextContent('Strategy framework');
    expect(screen.getByTestId('strata-admin-nav-scorecard-models')).toHaveTextContent('Scorecard models');
    expect(screen.getByTestId('strata-admin-nav-frameworks')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('strata-admin-nav-perspectives')).not.toHaveAttribute('aria-current');
  });

  it('clicking each governed item navigates to its route (link-out + inline sections)', () => {
    renderNav('perspectives');
    fireEvent.click(screen.getByTestId('strata-admin-nav-frameworks'));
    expect(screen.getByTestId('loc').textContent).toBe(Routes.strata.frameworks());
    fireEvent.click(screen.getByTestId('strata-admin-nav-scorecard-models'));
    expect(screen.getByTestId('loc').textContent).toBe(Routes.strata.adminSection('scorecard-models'));
    fireEvent.click(screen.getByTestId('strata-admin-nav-perspectives'));
    expect(screen.getByTestId('loc').textContent).toBe(Routes.strata.adminSection('perspectives'));
  });
});
