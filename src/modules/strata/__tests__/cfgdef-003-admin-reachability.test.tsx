/**
 * CFG-003 — required administration areas must be reachable from the
 * Configuration hub. Pins the wiring: a Cycles & periods section exists under
 * /strata/admin/:section, a hub card routes to it, and the previously-working
 * areas (data sources, access) keep their cards.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/strata/hooks/useStrata', () => {
  const ok = (data: unknown) => ({ data, isLoading: false, isError: false, error: null });
  return {
    StrataProvider: ({ children }: { children: React.ReactNode }) => children,
    useStrataContext: () => ({ cycles: [], periods: [], activeCycle: null, activePeriod: null }),
    useStrataRoles: () => ok([]),
    useStrataUserId: () => ok(null),
    useStrataAudit: () => ok([]),
    useProfileNames: () => ok(new Map()),
    usePerspectives: () => ok([]),
    useScorecardModels: () => ok([]),
    useAllModelPerspectives: () => ok([]),
    useAllModelMeasures: () => ok([]),
    useModelPerspectives: () => ok([]),
    useKpis: () => ok([]),
    useKpiTypes: () => ok([]),
    useThresholdSchemes: () => ok([]),
    useUploadTemplates: () => ok([]),
    useValueCategories: () => ok([]),
    useGateModels: () => ok([]),
    useWorkflowConfigs: () => ok([]),
    useChangeRequests: () => ok([]),
    useRoleAssignments: () => ok([]),
    useStrataNotificationRules: () => ok([]),
    useProjectCardFieldConfigs: () => ok([]),
    useProjectCardPicklists: () => ok([]),
    useProjectCardSectionConfigs: () => ok([]),
    useProjectCardTabConfigs: () => ok([]),
    useInvalidateStrata: () => vi.fn(),
    useStrataNotifications: () => ok([]),
    ctxToken: (n: string) => n,
  };
});
vi.mock('@/modules/strata/domain', () => ({
  configApi: {}, governanceApi: {}, scorecardApi: {}, strategyApi: {}, valueApi: {},
}));

import { DOMAINS, SECTIONS } from '../pages/StrataAdminConfigPage';
import { Routes } from '@/lib/routes';

describe('Configuration hub reachability (CFG-003)', () => {
  it('exposes a Cycles & periods section under /strata/admin/:section', () => {
    const cycles = SECTIONS.find((s) => s.key === 'cycles');
    expect(cycles).toBeDefined();
    expect(cycles!.label).toBe('Cycles & periods');
  });

  it('has a hub card routing to the cycles section', () => {
    const card = DOMAINS.find((d) => d.key === 'cycles-periods');
    expect(card).toBeDefined();
    expect(card!.to).toBe(Routes.strata.adminSection('cycles'));
    expect(card!.sectionLabels).toEqual(['Cycles', 'Periods']);
  });

  it('keeps data sources and access reachable (regression pin)', () => {
    expect(DOMAINS.find((d) => d.key === 'data-integration')?.to).toBe(Routes.strata.adminData());
    expect(DOMAINS.find((d) => d.key === 'workflow-access')?.to).toBe(Routes.strata.adminAccess());
  });

  it('every hub card routes to a real section or domain page', () => {
    const sectionKeys = new Set(SECTIONS.map((s) => s.key));
    const domainPages = new Set([Routes.strata.adminMeasurement(), Routes.strata.adminData(), Routes.strata.adminAccess()]);
    for (const d of DOMAINS) {
      const sectionMatch = d.to.match(/\/strata\/admin\/([a-z-]+)$/);
      const ok = domainPages.has(d.to) || (sectionMatch != null && sectionKeys.has(sectionMatch[1]));
      expect(ok, `card ${d.key} routes to ${d.to}`).toBe(true);
    }
  });
});
