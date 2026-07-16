/**
 * STRATA React Query hooks + module context.
 * Every screen reads its model/cycle/period/config context from StrataProvider
 * and renders data-state labels from these hooks — no local business math.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { supabase, typedRpc } from '@/integrations/supabase/client';
import {
  configApi, executionApi, governanceApi, kpiApi, lineageApi, scorecardApi, strategyApi, valueApi,
} from '../domain';
import type {
  ScorecardCalcResult, ScorecardPlanVariance,
  StrataCycle, StrataPeriod, StrataRole, StrataScorecardInstance, StrataThresholdScheme, ThresholdBand,
} from '../types';

const STALE = 30_000;

// ── Module context: active cycle + period ────────────────────────────────────
interface StrataContextValue {
  cycles: StrataCycle[];
  periods: StrataPeriod[];
  activeCycle: StrataCycle | null;
  activePeriod: StrataPeriod | null;
  setActiveCycleId: (id: string) => void;
  setActivePeriodId: (id: string) => void;
  isLoading: boolean;
}

const StrataContext = createContext<StrataContextValue | null>(null);

/** URL-safe context token ("Q2 FY2026" → "q2-fy2026") — bookmarkable cycle/period.
 * Exported so detail-route navigations can carry the owning cycle/period forward
 * (E2E-001: refresh/copied-URL/new-tab must restore the same context). */
export const ctxToken = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function StrataProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cycleOverride, setCycleOverride] = useState<string | null>(null);
  const [periodOverride, setPeriodOverride] = useState<string | null>(null);

  const cyclesQ = useQuery({ queryKey: ['strata', 'cycles'], queryFn: strategyApi.cycles, staleTime: STALE });
  const cycles = cyclesQ.data ?? [];
  const activeCycle = useMemo(
    () => cycles.find((c) => c.id === cycleOverride) ?? cycles.find((c) => c.status === 'active') ?? cycles[0] ?? null,
    [cycles, cycleOverride],
  );

  const periodsQ = useQuery({
    queryKey: ['strata', 'periods', activeCycle?.id],
    queryFn: () => strategyApi.periods(activeCycle!.id),
    enabled: !!activeCycle,
    staleTime: STALE,
  });
  const periods = periodsQ.data ?? [];
  // Shares the query key (and cache) with useScorecardInstances — no extra fetch on scorecard pages.
  const instancesQ = useQuery({
    queryKey: ['strata', 'scorecard-instances', activeCycle?.id],
    queryFn: () => scorecardApi.instances(activeCycle!.id),
    enabled: !!activeCycle,
    staleTime: STALE,
  });
  const activePeriod = useMemo(() => {
    if (periodOverride) {
      const p = periods.find((x) => x.id === periodOverride);
      if (p) return p;
    }
    const today = new Date().toISOString().slice(0, 10);
    const current =
      periods.find((p) => p.close_status === 'open' && p.starts_on <= today && p.ends_on >= today) ?? null;
    // Default to a period with evidence: prefer the calendar-current period only when a
    // scorecard exists for it, otherwise the most recent period that has one — an
    // executive should land on numbers, not an empty quarter.
    const scoredPeriodIds = new Set((instancesQ.data ?? []).map((i) => i.period_id));
    if (current && scoredPeriodIds.has(current.id)) return current;
    if (scoredPeriodIds.size > 0) {
      const scored = [...periods].sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1)).find((p) => scoredPeriodIds.has(p.id));
      if (scored) return scored;
    }
    return (
      current ??
      periods.filter((p) => p.close_status === 'open')[0] ??
      periods[periods.length - 1] ??
      null
    );
  }, [periods, periodOverride, instancesQ.data]);

  // ?cycle= / ?period= make the governed context bookmarkable (route-first canon).
  // Invalid/absent token → default logic above (zero-assumption).
  React.useEffect(() => {
    const token = searchParams.get('cycle');
    if (!token || cycleOverride || cycles.length === 0) return;
    const match = cycles.find((c) => ctxToken(c.name) === token);
    if (match) setCycleOverride(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycles, searchParams]);

  React.useEffect(() => {
    const token = searchParams.get('period');
    if (!token || periodOverride || periods.length === 0) return;
    const match = periods.find((p) => ctxToken(p.name) === token);
    if (match) setPeriodOverride(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods, searchParams]);

  const setActiveCycleId = React.useCallback((id: string) => {
    setCycleOverride(id);
    const c = cycles.find((x) => x.id === id);
    if (c) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('cycle', ctxToken(c.name));
        // Period tokens are cycle-scoped; a stale ?period= from the prior cycle
        // would resolve to nothing — drop it so the new cycle picks its default.
        next.delete('period');
        return next;
      }, { replace: true });
    }
  }, [cycles, setSearchParams]);

  const setActivePeriodId = React.useCallback((id: string) => {
    setPeriodOverride(id);
    const p = periods.find((x) => x.id === id);
    if (p) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('period', ctxToken(p.name));
        return next;
      }, { replace: true });
    }
  }, [periods, setSearchParams]);

  const value = useMemo<StrataContextValue>(() => ({
    cycles, periods, activeCycle, activePeriod,
    setActiveCycleId,
    setActivePeriodId,
    isLoading: cyclesQ.isLoading || periodsQ.isLoading,
  }), [cycles, periods, activeCycle, activePeriod, setActiveCycleId, setActivePeriodId, cyclesQ.isLoading, periodsQ.isLoading]);

  return <StrataContext.Provider value={value}>{children}</StrataContext.Provider>;
}

export function useStrataContext(): StrataContextValue {
  const ctx = useContext(StrataContext);
  if (!ctx) throw new Error('useStrataContext must be used inside <StrataProvider>');
  return ctx;
}

// ── Roles (UI affordance gating only — DB enforces the real rules) ──────────
export function useStrataRoles() {
  return useQuery({
    queryKey: ['strata', 'my-roles'],
    queryFn: async (): Promise<StrataRole[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const roles = await configApi.myRoles(auth.user.id);
      // Mirror the server's strata_is_admin(): platform admins/owners hold
      // every STRATA permission even without a strata_role_assignments row —
      // without this, authoring affordances hide from the very users the DB
      // would authorize (recovery session 004 fix).
      if (!roles.includes('strata_admin')) {
        const { data: isAdmin } = await typedRpc('strata_is_admin', {});
        if (isAdmin === true) roles.push('strata_admin');
      }
      return roles;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Identity: the current auth user id (CLOSEOUT W4 — drives the "Mine" filter). ─
export function useStrataUserId() {
  return useQuery({
    queryKey: ['strata', 'my-user-id'],
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Identity: owner/actor UUID → display name (zero-assumption: unknown → null) ─
export interface StrataProfileRef { name: string | null; email: string | null; avatarUrl: string | null }
export function useProfileNames() {
  return useQuery({
    queryKey: ['strata', 'profile-names'],
    queryFn: async (): Promise<Map<string, StrataProfileRef>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url');
      if (error) throw error;
      const m = new Map<string, StrataProfileRef>();
      (data ?? []).forEach((p) => {
        m.set(p.id, { name: p.full_name || p.email || null, email: p.email ?? null, avatarUrl: p.avatar_url ?? null });
      });
      return m;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Config ───────────────────────────────────────────────────────────────────
export const usePerspectives = () =>
  useQuery({ queryKey: ['strata', 'perspectives'], queryFn: configApi.perspectives, staleTime: STALE });
export const useThresholdSchemes = () =>
  useQuery({ queryKey: ['strata', 'threshold-schemes'], queryFn: configApi.thresholdSchemes, staleTime: STALE });
export const useValueCategories = () =>
  useQuery({ queryKey: ['strata', 'value-categories'], queryFn: configApi.valueCategories, staleTime: STALE });
export const useGateModels = () =>
  useQuery({ queryKey: ['strata', 'gate-models'], queryFn: configApi.gateModels, staleTime: STALE });
export const useKpiTypes = () =>
  useQuery({ queryKey: ['strata', 'kpi-types'], queryFn: configApi.kpiTypes, staleTime: STALE });
export const useUploadTemplates = () =>
  useQuery({ queryKey: ['strata', 'upload-templates'], queryFn: configApi.uploadTemplates, staleTime: STALE });
export const useWorkflowConfigs = () =>
  useQuery({ queryKey: ['strata', 'workflows'], queryFn: configApi.workflows, staleTime: STALE });
export const useChangeRequests = () =>
  useQuery({ queryKey: ['strata', 'change-requests'], queryFn: configApi.changeRequests, staleTime: STALE });
export const useStrataAudit = (entityTable?: string) =>
  useQuery({ queryKey: ['strata', 'audit', entityTable], queryFn: () => configApi.auditEvents(entityTable), staleTime: STALE });

/** Resolve a band key (org-configured) to its label + ADS appearance from governed config. */
export function useBandResolver() {
  const schemes = useThresholdSchemes();
  return useMemo(() => {
    const bands = new Map<string, ThresholdBand>();
    (schemes.data ?? []).forEach((s: StrataThresholdScheme) =>
      (s.bands ?? []).forEach((b) => { if (!bands.has(b.key)) bands.set(b.key, b); }));
    return (key: string | null | undefined): ThresholdBand | null => (key ? bands.get(key) ?? null : null);
  }, [schemes.data]);
}

// ── Strategy ─────────────────────────────────────────────────────────────────
export const useStrategyElements = (cycleId?: string) =>
  useQuery({
    queryKey: ['strata', 'elements', cycleId],
    queryFn: () => strategyApi.elements(cycleId!),
    enabled: !!cycleId,
    staleTime: STALE,
  });
export const useStrategyElementBySlug = (slug?: string) =>
  useQuery({
    queryKey: ['strata', 'element', slug],
    queryFn: () => strategyApi.elementBySlug(slug!),
    enabled: !!slug,
    staleTime: STALE,
  });
export const useMapEdges = (cycleId?: string) =>
  useQuery({ queryKey: ['strata', 'edges', cycleId], queryFn: () => strategyApi.edges(cycleId!), enabled: !!cycleId, staleTime: STALE });
export const useThemeCharters = () =>
  useQuery({ queryKey: ['strata', 'charters'], queryFn: strategyApi.charters, staleTime: STALE });
export const useElementKpis = () =>
  useQuery({ queryKey: ['strata', 'element-kpis'], queryFn: strategyApi.elementKpis, staleTime: STALE });

// ── Scorecards ───────────────────────────────────────────────────────────────
export const useScorecardModels = () =>
  useQuery({ queryKey: ['strata', 'scorecard-models'], queryFn: scorecardApi.models, staleTime: STALE });
export const useModelPerspectives = (modelId?: string) =>
  useQuery({
    queryKey: ['strata', 'model-perspectives', modelId],
    queryFn: () => scorecardApi.modelPerspectives(modelId!),
    enabled: !!modelId,
    staleTime: STALE,
  });
export const useRoleSod = (userId?: string) =>
  useQuery({
    queryKey: ['strata', 'role-sod', userId],
    queryFn: () => governanceApi.checkRoleSod(userId!),
    enabled: !!userId,
    staleTime: STALE,
  });
export const useModelMeasures = (modelId?: string) =>
  useQuery({
    queryKey: ['strata', 'model-measures', modelId],
    queryFn: () => scorecardApi.modelMeasures(modelId!),
    enabled: !!modelId,
    staleTime: STALE,
  });
export const useAllModelMeasures = () =>
  useQuery({ queryKey: ['strata', 'model-measures-all'], queryFn: scorecardApi.allModelMeasures, staleTime: STALE });
export const useAllModelPerspectives = () =>
  useQuery({ queryKey: ['strata', 'model-perspectives-all'], queryFn: scorecardApi.allModelPerspectives, staleTime: STALE });
export const useScorecardInstances = (cycleId?: string) =>
  useQuery({
    queryKey: ['strata', 'scorecard-instances', cycleId],
    queryFn: () => scorecardApi.instances(cycleId),
    staleTime: STALE,
  });
export const useScorecardInstanceBySlug = (slug?: string) =>
  useQuery({
    queryKey: ['strata', 'scorecard-instance', slug],
    queryFn: () => scorecardApi.instanceBySlug(slug!),
    enabled: !!slug,
    staleTime: STALE,
  });
export const useScorecardLines = (instanceId?: string) =>
  useQuery({
    queryKey: ['strata', 'scorecard-lines', instanceId],
    queryFn: () => scorecardApi.lines(instanceId!),
    enabled: !!instanceId,
    staleTime: STALE,
  });
/** Server-computed result; locked instances read the frozen snapshot payload. */
export const useScorecardCalc = (instance?: StrataScorecardInstance | null) =>
  useQuery({
    queryKey: ['strata', 'scorecard-calc', instance?.id, instance?.status],
    queryFn: () => scorecardApi.calcResult(instance!),
    enabled: !!instance,
    staleTime: STALE,
  });

/**
 * Batch calc for many instances (index/aggregate views — Scorecards Index cards,
 * judgment one-liner). Same queryKey/queryFn as useScorecardCalc so every result
 * dedupes with any single-instance subscription. `instances` MUST be memoised by
 * the caller (array identity drives the query set).
 */
export const useScorecardCalcs = (instances: StrataScorecardInstance[]) => {
  const results = useQueries({
    queries: instances.map((inst) => ({
      queryKey: ['strata', 'scorecard-calc', inst.id, inst.status],
      queryFn: () => scorecardApi.calcResult(inst),
      staleTime: STALE,
    })),
  });
  return useMemo(() => {
    const byId = new Map<string, ScorecardCalcResult | null>();
    instances.forEach((inst, i) => byId.set(inst.id, results[i]?.data ?? null));
    return {
      byId,
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
    };
  }, [instances, results]);
};

/** Batch plan-variance (strata_calc_scorecard_plan_variance, read-only) for the
 *  Scorecards Index ranked panel. Caller memoises `instances`. */
export const useScorecardPlanVariances = (instances: StrataScorecardInstance[]) => {
  const results = useQueries({
    queries: instances.map((inst) => ({
      queryKey: ['strata', 'scorecard-plan-variance', inst.id, inst.status],
      queryFn: () => scorecardApi.planVariance(inst.id),
      staleTime: STALE,
    })),
  });
  return useMemo(() => {
    const byId = new Map<string, ScorecardPlanVariance | null>();
    instances.forEach((inst, i) => byId.set(inst.id, results[i]?.data ?? null));
    return {
      byId,
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
    };
  }, [instances, results]);
};

// ── KPIs ─────────────────────────────────────────────────────────────────────
export const useKpis = () => useQuery({ queryKey: ['strata', 'kpis'], queryFn: kpiApi.list, staleTime: STALE });
export const useKpiBySlug = (slug?: string) =>
  useQuery({ queryKey: ['strata', 'kpi', slug], queryFn: () => kpiApi.bySlug(slug!), enabled: !!slug, staleTime: STALE });
export const useKpiDetail = (kpiId?: string) =>
  useQuery({
    queryKey: ['strata', 'kpi-detail', kpiId],
    queryFn: async () => {
      const [formulas, targets, actuals, lineage, calc] = await Promise.all([
        kpiApi.formulaVersions(kpiId!),
        kpiApi.targets(kpiId!),
        kpiApi.actuals(kpiId!),
        lineageApi.lineageForEntity('strata_kpi_actuals_by_kpi', kpiId!).catch(() => []),
        lineageApi.calcValues('kpi', kpiId!),
      ]);
      return { formulas, targets, actuals, lineage, calc };
    },
    enabled: !!kpiId,
    staleTime: STALE,
  });
export const useKpiAchievement = (kpiId?: string, periodId?: string) =>
  useQuery({
    queryKey: ['strata', 'kpi-achievement', kpiId, periodId],
    queryFn: () => kpiApi.achievement(kpiId!, periodId!),
    enabled: !!kpiId && !!periodId,
    staleTime: STALE,
  });
export const useOkrs = () => useQuery({ queryKey: ['strata', 'okrs'], queryFn: kpiApi.okrs, staleTime: STALE });
export const useSavedViews = (entity: string) =>
  useQuery({ queryKey: ['strata', 'saved-views', entity], queryFn: () => kpiApi.savedViews(entity), staleTime: STALE });

// ── Execution ────────────────────────────────────────────────────────────────
export const useInitiatives = () =>
  useQuery({ queryKey: ['strata', 'initiatives'], queryFn: executionApi.initiatives, staleTime: STALE });
export const useProjectCards = () =>
  useQuery({ queryKey: ['strata', 'project-cards'], queryFn: executionApi.projectCards, staleTime: STALE });
// Initiative drill-down hooks removed with InitiativeDetailModal (REQ-019 —
// Initiative is a legacy read-only concept; useInitiatives stays for member
// name resolution in the VMO until legacy memberships retire).
export const useMilestones = (projectCardId?: string) =>
  useQuery({
    queryKey: ['strata', 'milestones', projectCardId ?? 'all'],
    queryFn: () => executionApi.milestones(projectCardId),
    staleTime: STALE,
  });
export const useDependencies = () =>
  useQuery({ queryKey: ['strata', 'dependencies'], queryFn: executionApi.dependencies, staleTime: STALE });
export const useRisks = (projectCardId?: string) =>
  useQuery({
    queryKey: ['strata', 'risks', projectCardId ?? 'all'],
    queryFn: () => executionApi.risks(projectCardId),
    staleTime: STALE,
  });
export const useProjectCardBySlug = (slug?: string) =>
  useQuery({
    queryKey: ['strata', 'project-card', slug],
    queryFn: () => executionApi.projectCardBySlug(slug!),
    enabled: !!slug,
    staleTime: STALE,
  });
/** Project Objectives for a card — same strata_strategy_elements framework as Theme Objectives. */
export const useProjectObjectives = (projectCardId?: string) =>
  useQuery({
    queryKey: ['strata', 'project-objectives', projectCardId],
    queryFn: () => executionApi.projectObjectives(projectCardId!),
    enabled: !!projectCardId,
    staleTime: STALE,
  });
/** Project KPIs / Measures for a card — same strata_kpis framework as Theme KPIs. */
export const useProjectKpis = (projectCardId?: string) =>
  useQuery({
    queryKey: ['strata', 'project-kpis', projectCardId],
    queryFn: () => executionApi.projectKpis(projectCardId!),
    enabled: !!projectCardId,
    staleTime: STALE,
  });

// ── Project Card configuration engine ───────────────────────────────────────
export const useProjectCardTabConfigs = (cardType?: string) =>
  useQuery({ queryKey: ['strata', 'pc-tab-configs', cardType ?? 'all'], queryFn: () => configApi.projectCardTabConfigs(cardType), staleTime: STALE });
export const useProjectCardSectionConfigs = (cardType?: string) =>
  useQuery({ queryKey: ['strata', 'pc-section-configs', cardType ?? 'all'], queryFn: () => configApi.projectCardSectionConfigs(cardType), staleTime: STALE });
export const useProjectCardFieldConfigs = (cardType?: string) =>
  useQuery({ queryKey: ['strata', 'pc-field-configs', cardType ?? 'all'], queryFn: () => configApi.projectCardFieldConfigs(cardType), staleTime: STALE });
export const useProjectCardPicklists = (picklistKey?: string) =>
  useQuery({ queryKey: ['strata', 'pc-picklists', picklistKey ?? 'all'], queryFn: () => configApi.projectCardPicklists(picklistKey), staleTime: STALE });

// ── Value / VMO ──────────────────────────────────────────────────────────────
export const usePortfolioBySlug = (slug?: string) =>
  useQuery({
    queryKey: ['strata', 'portfolio', slug],
    queryFn: () => valueApi.portfolioBySlug(slug!),
    enabled: !!slug,
    staleTime: STALE,
  });

/** Resolve a benefit (incl. its owning portfolio_id) directly from its slug so a
 * benefit deep link can restore the correct Portfolio atomically instead of
 * inheriting ?portfolio=/the first portfolio (STRATA-E2E-018). */
export const useBenefitBySlug = (slug?: string) =>
  useQuery({
    queryKey: ['strata', 'benefit', slug],
    queryFn: () => valueApi.benefitBySlug(slug!),
    enabled: !!slug,
    staleTime: STALE,
  });

/** Enterprise score per period across the cycle — server-calculated history only. */
export function useEnterpriseScoreTrend(cycleId?: string) {
  const instancesQ = useScorecardInstances(cycleId);
  const instances = instancesQ.data ?? [];
  const ids = instances.map((i) => i.id);
  return useQuery({
    queryKey: ['strata', 'enterprise-trend', cycleId, ids.join(',')],
    queryFn: async () => {
      const values = await lineageApi.calcValuesForEntities('scorecard_instance', ids);
      // newest first — keep the latest 'score' row per instance
      const latestByInstance = new Map<string, (typeof values)[number]>();
      values.forEach((v) => {
        if (v.metric_key !== 'score') return;
        if (!latestByInstance.has(v.entity_id)) latestByInstance.set(v.entity_id, v);
      });
      return instances
        .map((inst) => {
          const v = latestByInstance.get(inst.id);
          return v && v.value != null
            ? { instanceId: inst.id, periodId: inst.period_id, score: Number(v.value), statusKey: v.status_key ?? null, slug: inst.slug ?? null }
            : null;
        })
        .filter((p): p is NonNullable<typeof p> => p != null);
    },
    enabled: ids.length > 0,
    staleTime: STALE,
  });
}

export const usePortfolios = () =>
  useQuery({ queryKey: ['strata', 'portfolios'], queryFn: valueApi.portfolios, staleTime: STALE });
export const useBenefits = (portfolioId?: string) =>
  useQuery({ queryKey: ['strata', 'benefits', portfolioId ?? 'all'], queryFn: () => valueApi.benefits(portfolioId), staleTime: STALE });
export const useBenefitValues = (benefitId?: string) =>
  useQuery({
    queryKey: ['strata', 'benefit-values', benefitId],
    queryFn: () => valueApi.benefitValues(benefitId!),
    enabled: !!benefitId,
    staleTime: STALE,
  });
export const useAssumptions = (benefitId?: string) =>
  useQuery({
    queryKey: ['strata', 'assumptions', benefitId],
    queryFn: () => valueApi.assumptions(benefitId!),
    enabled: !!benefitId,
    staleTime: STALE,
  });
export const useGateInstances = () =>
  useQuery({ queryKey: ['strata', 'gates'], queryFn: valueApi.gateInstances, staleTime: STALE });
/** Benefit ↔ Project Card attribution (Execution Reconciliation §K rule 19). */
export const useBenefitProjectCards = () =>
  useQuery({ queryKey: ['strata', 'benefit-project-cards'], queryFn: valueApi.benefitProjectCards, staleTime: STALE });
export const useValueAtRisk = (portfolioId?: string) =>
  useQuery({
    queryKey: ['strata', 'var', portfolioId],
    queryFn: () => lineageApi.latestCalc('portfolio', portfolioId!, 'value_at_risk'),
    enabled: !!portfolioId,
    staleTime: STALE,
  });
export const useBenefitRealization = (benefitId?: string) =>
  useQuery({
    queryKey: ['strata', 'realization', benefitId],
    queryFn: () => lineageApi.latestCalc('benefit', benefitId!, 'realization_index'),
    enabled: !!benefitId,
    staleTime: STALE,
  });

// ── Lineage ──────────────────────────────────────────────────────────────────
export const useDataSources = () =>
  useQuery({ queryKey: ['strata', 'data-sources'], queryFn: lineageApi.dataSources, staleTime: STALE });
export const useUploadRuns = () =>
  useQuery({ queryKey: ['strata', 'upload-runs'], queryFn: lineageApi.uploadRuns, staleTime: STALE });
export const useRunDetail = (runKey?: string) =>
  useQuery({
    queryKey: ['strata', 'run-detail', runKey],
    queryFn: async () => {
      const runRow = await lineageApi.runByKey(runKey!);
      if (!runRow) return null;
      const [rows, results] = await Promise.all([
        lineageApi.stagingRows(runRow.id),
        lineageApi.validationResults(runRow.id),
      ]);
      return { run: runRow, rows, results };
    },
    enabled: !!runKey,
    staleTime: STALE,
  });
export const useCalcValues = (entityType?: string, entityId?: string) =>
  useQuery({
    queryKey: ['strata', 'calc-values', entityType, entityId],
    queryFn: () => lineageApi.calcValues(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
    staleTime: STALE,
  });

// ── Governance ───────────────────────────────────────────────────────────────
export const useSnapshots = () =>
  useQuery({ queryKey: ['strata', 'snapshots'], queryFn: governanceApi.snapshots, staleTime: STALE });
export const useSnapshotByKey = (snapshotKey?: string) =>
  useQuery({
    queryKey: ['strata', 'snapshot', snapshotKey],
    queryFn: () => governanceApi.snapshotByKey(snapshotKey!),
    enabled: !!snapshotKey,
    staleTime: STALE,
  });
export const useSnapshotItems = (snapshotId?: string) =>
  useQuery({
    queryKey: ['strata', 'snapshot-items', snapshotId],
    queryFn: () => governanceApi.snapshotItems(snapshotId!),
    enabled: !!snapshotId,
    staleTime: STALE,
  });
export const useDecisions = () =>
  useQuery({ queryKey: ['strata', 'decisions'], queryFn: governanceApi.decisions, staleTime: STALE });
export const useActions = () =>
  useQuery({ queryKey: ['strata', 'actions'], queryFn: governanceApi.actions, staleTime: STALE });
export const useBoardPacks = (snapshotId?: string) =>
  useQuery({
    queryKey: ['strata', 'board-packs', snapshotId],
    queryFn: () => governanceApi.boardPacks(snapshotId!),
    enabled: !!snapshotId,
    staleTime: STALE,
  });
/** All board packs across snapshots (reviews-index pack-stage dot, slice 4B). */
export const useAllBoardPacks = () =>
  useQuery({ queryKey: ['strata', 'board-packs', 'all'], queryFn: governanceApi.boardPacksAll, staleTime: STALE });
export const useAiOutputs = () =>
  useQuery({ queryKey: ['strata', 'ai-outputs'], queryFn: governanceApi.aiOutputs, staleTime: STALE });
// ── Notifications (CAT-STRATA-CLOSEOUT-20260710-001 W3) ──────────────────────
export const useStrataNotifications = () =>
  useQuery({ queryKey: ['strata', 'notifications'], queryFn: governanceApi.notifications, staleTime: STALE });
export const useStrataNotificationRules = () =>
  useQuery({ queryKey: ['strata', 'notification-rules'], queryFn: governanceApi.notificationRules, staleTime: STALE });

// ── Recovery additions (CAT-STRATA-20260705-001 session 004) ─────────────────
/** Rule-driven Needs Attention feed (F-REP-004) — replaces seeded exceptions. */
export const useNeedsAttention = (periodId?: string) =>
  useQuery({
    queryKey: ['strata', 'needs-attention', periodId ?? 'all'],
    queryFn: () => governanceApi.needsAttention(periodId),
    staleTime: STALE,
  });
/** Generic execution links (project→objective/KPI/benefit traceability). */
export const useExecutionLinks = () =>
  useQuery({ queryKey: ['strata', 'execution-links'], queryFn: executionApi.executionLinks, staleTime: STALE });
/** All role assignments (admin roles tab + SoD visibility). */
export const useRoleAssignments = () =>
  useQuery({ queryKey: ['strata', 'role-assignments'], queryFn: governanceApi.roleAssignments, staleTime: STALE });
/** Full KPI evidence chain for one KPI+period (F-REP-005). */
export const useKpiEvidenceChain = (kpiId?: string, periodId?: string) =>
  useQuery({
    queryKey: ['strata', 'evidence-chain', kpiId, periodId],
    queryFn: () => kpiApi.evidenceChain(kpiId!, periodId!),
    enabled: !!kpiId && !!periodId,
    staleTime: STALE,
  });

export function useInvalidateStrata() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['strata'] });
}
