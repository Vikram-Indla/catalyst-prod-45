/**
 * STRATA Project Card detail — page-level workspace (route-based, not a
 * modal), Execution Reconciliation Report §K/§N. Rendered inline by
 * StrataExecutionPage at /strata/execution/:slug once the slug resolves to a
 * Project Card (Execution Reconciliation rule 20 — Project Card is the sole
 * execution object; Initiative is no longer a detail target here).
 *
 * Default tabs only: Overview · Scope & Measures · Delivery. Optional
 * fields/sections are gated by strata_project_card_field_configs — never
 * shown unless enabled in Admin > Project Card Configuration.
 *
 * Project Objectives / Project KPIs reuse the SAME strata_strategy_elements /
 * strata_kpis frameworks as Theme Objectives / Theme KPIs (context='project'),
 * linked via the generic strata_execution_links bridge — no second model.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import {
  Avatar, Button, CatalystTag, EmptyState, Lozenge, ProgressBar, SectionMessage, Tooltip,
} from '@/components/ads';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { executionApi, valueApi } from '../domain';
import {
  useBenefitProjectCards, useBenefits, useCardAudit, usePortfolios, useSharedBenefitAttributions,
  useDependencies, useExecutionLinks, useMilestones, useProfileNames,
  useProjectCardFieldConfigs, useProjectCardPicklists, useProjectCardSectionConfigs, useProjectKpis,
  useProjectObjectives, useInvalidateStrata, useKpis, useRisks, useStrataContext, useStrataRoles,
  useStrataUserId, useStrategyElements,
} from '../hooks/useStrata';
import type {
  StrataBenefit, StrataBenefitValue, StrataDependency, StrataMilestone, StrataPortfolio, StrataProjectCard, StrataRisk, StrataRole,
  StrataStrategyElement,
} from '../types';
import { countsTowardRealization } from '../assurance';
import { fmtDate, fmtSarCompact, labelize } from './format';
import { StrataFormModal } from './authoring';
import type { StrataFormValues } from './authoring';
import { StrataExecutionHealthLozenge, StrataPanel, T } from './shared';

const WRITE_ROLES: StrataRole[] = ['strategy_office', 'vmo_validator', 'data_steward', 'strata_admin'];
const ARCHIVE_ROLES: StrataRole[] = ['strategy_office', 'vmo_validator', 'strata_admin'];
const KPI_WRITE_ROLES: StrataRole[] = ['strategy_office', 'kpi_owner', 'strata_admin'];
// Project Objective creation is narrower than general write: strata_create_project_objective
// rejects everyone but strategy_office + admin. Gate the button to match the RPC so
// vmo_validator / data_steward don't see an action that always fails (STRATA-E2E-003).
const OBJECTIVE_WRITE_ROLES: StrataRole[] = ['strategy_office', 'strata_admin'];

const MILESTONE_STATUS: Record<StrataMilestone['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  done: 'success', in_progress: 'inprogress', planned: 'default', missed: 'removed', descoped: 'default',
};
const DEPENDENCY_STATUS: Record<StrataDependency['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  open: 'default', at_risk: 'moved', blocked: 'removed', resolved: 'success', cancelled: 'default',
};
const DEPENDENCY_STATUS_OPTIONS = ['open', 'at_risk', 'blocked', 'resolved', 'cancelled'];
const DEPENDENCY_TYPE_OPTIONS = ['delivery', 'data', 'decision', 'resource', 'external'];
const MILESTONE_STATUS_OPTIONS = ['planned', 'in_progress', 'done', 'missed', 'descoped'];
const RISK_STATUS: Record<StrataRisk['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  open: 'default', mitigating: 'inprogress', accepted: 'moved', closed: 'success',
};
// Lozenge owns its color per ADS; higher risk = more urgent appearance.
const RISK_LEVEL: Record<'low' | 'medium' | 'high', React.ComponentProps<typeof Lozenge>['appearance']> = {
  low: 'default', medium: 'moved', high: 'removed',
};
const RISK_STATUS_OPTIONS = ['open', 'mitigating', 'accepted', 'closed'];
const RISK_LEVEL_OPTIONS = ['low', 'medium', 'high'];

const fvStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
const fvNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const wasCleared = (initial: string | null | undefined, submitted: unknown): boolean =>
  initial != null && (submitted == null || (typeof submitted === 'string' && submitted.trim() === ''));
const asFraction = (v: number | null | undefined): number | null =>
  v == null ? null : Math.max(0, Math.min(1, v > 1 ? v / 100 : v));

const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };
const Dash = () => <span style={{ color: T.subtlest }}>—</span>;

function SummaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  );
}

function TabSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function LinkedRow({ primary, meta, actionLabel = 'Unlink', onAction, canAct }: {
  primary: React.ReactNode; meta?: React.ReactNode; actionLabel?: string; onAction?: () => void; canAct: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: `1px solid ${T.border}`, borderRadius: 6, background: T.raised }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, overflowWrap: 'anywhere' }}>{primary}</span>
      {meta ? <span style={captionStyle}>{meta}</span> : null}
      {canAct && onAction ? <Button appearance="subtle" spacing="compact" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}

// Single-column collapse of the anchor-07 body + rail (annotation: @container <680;
// STRATA rail folds under the body on narrow — use a slightly wider 1100 breakpoint).
function useIsNarrow(breakpoint = 1100): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return narrow;
}

// Anchor-07 section card: bordered panel with a small uppercase label (rail + health).
function DetailPanel({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, padding: 16 }}>
      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, letterSpacing: '0.04em', color: T.subtlest, marginBottom: 'var(--ds-space-100)' }}>{label}</div>
      {children}
    </section>
  );
}

// Rail key/value row (CatalystSidebarDetails-style field rows, anchor 07).
function RailField({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 8, padding: 'var(--ds-space-050) 0', alignItems: 'center' }}>
      <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)' }}>{k}</span>
      <span style={{ color: T.text, fontWeight: 500, fontSize: 'var(--ds-font-size-200)', overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  );
}

type FormKey =
  | 'edit' | 'archive' | 'complete' | 'cancel' | 'set-objective' | 'link-benefit' | 'submit' | 'approve'
  | 'new-milestone' | 'edit-milestone'
  | 'new-dependency' | 'edit-dependency' | 'new-blocker'
  | 'new-risk' | 'edit-risk'
  | 'new-objective' | 'new-kpi'
  | null;

const TERMINAL_STAGES = ['completed', 'cancelled', 'archived'];

export function ProjectCardDetailView({ card, theme }: {
  card: StrataProjectCard;
  theme: StrataStrategyElement | null;
}) {
  const invalidate = useInvalidateStrata();
  const roles = useStrataRoles().data ?? [];
  const canWrite = roles.some((r) => WRITE_ROLES.includes(r));
  const canWriteKpi = roles.some((r) => KPI_WRITE_ROLES.includes(r));
  const canWriteObjective = roles.some((r) => OBJECTIVE_WRITE_ROLES.includes(r));
  const canArchive = roles.some((r) => ARCHIVE_ROLES.includes(r));
  // PC-DEF-004/003/005: a terminal project card is frozen — no edit / lifecycle action.
  const isTerminal = TERMINAL_STAGES.includes(card.stage);
  const { activeCycle, activePeriod } = useStrataContext();

  const milestonesQ = useMilestones(card.id);
  const dependenciesQ = useDependencies();
  const risksQ = useRisks(card.id);
  const objectivesQ = useProjectObjectives(card.id);
  const projectKpisQ = useProjectKpis(card.id);
  const allKpisQ = useKpis();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const executionLinksQ = useExecutionLinks();
  const profilesQ = useProfileNames();
  const fieldConfigsQ = useProjectCardFieldConfigs(card.card_type);
  const sectionConfigsQ = useProjectCardSectionConfigs(card.card_type);
  const lobPicklistQ = useProjectCardPicklists('lead_business_unit');
  const teamPicklistQ = useProjectCardPicklists('delivery_team');
  const sectorPicklistQ = useProjectCardPicklists('sector');
  const deliveryStatusPicklistQ = useProjectCardPicklists('delivery_status');

  const [form, setForm] = useState<FormKey>(null);
  const [editMilestone, setEditMilestone] = useState<StrataMilestone | null>(null);
  const [editDependency, setEditDependency] = useState<StrataDependency | null>(null);
  const [editRisk, setEditRisk] = useState<StrataRisk | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const risks = risksQ.data ?? [];
  const milestones = milestonesQ.data ?? [];
  const objectives = objectivesQ.data ?? [];
  const projectKpis = projectKpisQ.data ?? [];
  const allKpis = allKpisQ.data ?? [];
  const elements = elementsQ.data ?? [];

  const themeElements = elements.filter((e) => e.element_type === 'theme');
  const themeObjectives = elements.filter((e) => e.context === 'theme' && e.element_type === 'objective');
  const themeKpis = allKpis; // scoping to strictly theme-linked KPIs is a future refinement; all KPIs are valid roll-up targets today
  // PC-DEF-002 — the "New KPI" action now REUSES an approved governed KPI rather
  // than minting a project-local master. Only approved dictionary KPIs are selectable.
  const approvedKpis = useMemo(() => allKpis.filter((k) => k.status === 'approved'), [allKpis]);

  // Resolved upward roll-up target per Project KPI. The parent Theme KPI is a
  // 'rolls_up_to' execution link (strata_execution_links), not a column — resolve
  // its NAME against themeKpis. Zero-assumption: unresolved → nothing rendered.
  const themeKpiNameById = useMemo(() => new Map(themeKpis.map((k) => [k.id, k.name])), [themeKpis]);
  const parentThemeKpiIdByProjectKpi = useMemo(() => {
    const m = new Map<string, string>();
    (executionLinksQ.data ?? []).forEach((lk) => {
      if (lk.from_type === 'kpi' && lk.to_type === 'kpi' && lk.relationship_type === 'rolls_up_to') {
        m.set(lk.from_id, lk.to_id);
      }
    });
    return m;
  }, [executionLinksQ.data]);

  const projectDependencies = (dependenciesQ.data ?? []).filter(
    (d) => (d.requesting_type === 'project_card' && d.requesting_id === card.id)
      || (d.serving_type === 'project_card' && d.serving_id === card.id),
  );
  // Blockers are first-class on the executive card (locked goal §Project Card, REQ-011):
  // blocking dependencies in either direction, until resolved/cancelled.
  const blockers = projectDependencies.filter(
    (d) => (d.is_blocker || d.status === 'blocked') && d.status !== 'resolved' && d.status !== 'cancelled',
  );

  const fieldVisible = useMemo(() => {
    const map = new Map<string, boolean>();
    (fieldConfigsQ.data ?? []).forEach((f) => map.set(f.field_key, f.is_visible));
    return (key: string, defaultVisible = false) => map.get(key) ?? defaultVisible;
  }, [fieldConfigsQ.data]);

  const sectionVisible = useMemo(() => {
    const map = new Map<string, boolean>();
    (sectionConfigsQ.data ?? []).forEach((s) => map.set(`${s.tab_key}.${s.section_key}`, s.is_visible));
    return (tabKey: string, sectionKey: string) => map.get(`${tabKey}.${sectionKey}`) ?? true;
  }, [sectionConfigsQ.data]);

  const profileName = (id: string | null) => (id ? profilesQ.data?.get(id)?.name ?? null : null);

  const doAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try { await fn(); invalidate(); } catch (e) { setActionError(e instanceof Error ? e.message : String(e)); }
  };
  const submitAndRefresh = (fn: (v: StrataFormValues) => Promise<unknown>) =>
    async (v: StrataFormValues) => { await fn(v); invalidate(); };

  // Milestone names are unique within a card, trim- and case-insensitive
  // (V3-OPEN-017). This is the instant in-modal guard; a DB unique index is the
  // concurrency-safe backstop. `excludeId` lets an edit keep its own name.
  const assertUniqueMilestoneName = (rawName: string, excludeId?: string) => {
    const norm = rawName.trim().toLowerCase();
    const clash = milestones.some((m) => m.id !== excludeId && m.name.trim().toLowerCase() === norm);
    if (clash) throw new Error(`A milestone named "${rawName.trim()}" already exists in this project card.`);
  };

  const derivedProgress = asFraction(card.actual_progress);
  const isNarrow = useIsNarrow(1100);
  // Strategic-role prose (anchor 07) — real fields only, never invented.
  const linkedObjective = card.objective_element_id ? themeObjectives.find((o) => o.id === card.objective_element_id) ?? null : null;
  const roleProse = card.value_hypothesis?.trim() || card.scope_description?.trim() || card.business_case?.trim() || null;
  const forecastLate = (card.forecast_variance_days ?? 0) > 0;

  // ── Unified "What threatens the forecast" (anchor 07) ──────────────────────
  // Milestones-at-risk + dependencies + risks + blockers merged into one list,
  // ranked by CLIENT-DERIVED schedule impact (no schedule_impact column exists —
  // milestone slip / dependency overdue from dates; risks carry no schedule date
  // so they rank last with a level, never a fabricated day count).
  const threats = useMemo(() => {
    type ThreatItem = { kind: string; tone: React.ComponentProps<typeof Lozenge>['appearance']; title: string; detail: string; impact: string; impactDays: number };
    const out: ThreatItem[] = [];
    const overdueDays = (d: string | null) => (d && new Date(d).getTime() < Date.now() ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : 0);
    const slipDays = (fc: string | null, base: string | null) => (fc && base ? Math.max(0, Math.round((new Date(fc).getTime() - new Date(base).getTime()) / 86_400_000)) : 0);
    milestones.forEach((m) => {
      if (m.status === 'done' || m.status === 'descoped') return;
      const impactDays = slipDays(m.forecast_date, m.baseline_end) || overdueDays(m.baseline_end);
      if (impactDays <= 0) return;
      out.push({ kind: 'MILESTONE', tone: 'moved', title: m.name, detail: `Forecast ${fmtDate(m.forecast_date)} · baseline ${fmtDate(m.baseline_end)}`, impact: `+${impactDays} days`, impactDays });
    });
    projectDependencies.forEach((d) => {
      if (d.status === 'resolved' || d.status === 'cancelled') return;
      const od = overdueDays(d.due_date);
      const blocker = d.is_blocker || d.status === 'blocked';
      out.push({ kind: blocker ? 'BLOCKER' : 'DEPENDENCY', tone: blocker ? 'removed' : 'default', title: d.name ?? d.serving_label ?? labelize(d.dependency_type), detail: d.impact ?? (d.serving_label ? `Serving: ${d.serving_label}` : ''), impact: od > 0 ? `${od} days overdue` : 'open', impactDays: od });
    });
    risks.forEach((r) => {
      if (r.status === 'closed') return;
      out.push({ kind: 'RISK', tone: r.impact === 'high' ? 'removed' : r.impact === 'medium' ? 'moved' : 'default', title: r.title, detail: r.target_resolution_date ? `Target ${fmtDate(r.target_resolution_date)}` : (r.mitigation ?? ''), impact: r.impact ? `${labelize(r.impact)} impact` : '—', impactDays: 0 });
    });
    return out.sort((a, b) => b.impactDays - a.impactDays);
  }, [milestones, projectDependencies, risks]);

  // ── Reverse benefit traceability (PB-DEF-006) — from THIS Project Card back to the
  // portfolio benefit(s) that attribute value to it, using the GOVERNED attribution rule
  // (shared_benefit splits), never inferred from names or portfolio membership. ─────────
  const benefitLinks = useBenefitProjectCards().data ?? [];
  const sharedAttrRules = (useSharedBenefitAttributions().data ?? []) as Array<{ id: string; benefit_id: string; rule_type: string; definition: unknown }>;
  const allBenefits = (useBenefits().data ?? []) as StrataBenefit[];
  const portfolios = (usePortfolios().data ?? []) as StrataPortfolio[];

  // Governed attribution edges for this card: rule splits (portfolio attribution UI) win over any
  // direct benefit_project_cards link. pct is 0–100.
  const cardEdges = useMemo(() => {
    const byBenefit = new Map<string, { benefit_id: string; pct: number; ruleType: string; ruleId: string | null }>();
    for (const l of benefitLinks) {
      if (l.project_card_id !== card.id) continue;
      byBenefit.set(l.benefit_id, {
        benefit_id: l.benefit_id, pct: l.attribution_share == null ? 100 : Number(l.attribution_share),
        ruleType: 'direct_link', ruleId: null,
      });
    }
    for (const r of sharedAttrRules) {
      const def = r.definition as { splits?: Array<{ project_card_id?: string; pct?: number }> } | null;
      const splits = Array.isArray(def?.splits) ? def!.splits : [];
      for (const s of splits) {
        if (s?.project_card_id !== card.id || typeof s.pct !== 'number') continue;
        byBenefit.set(r.benefit_id, { benefit_id: r.benefit_id, pct: s.pct, ruleType: r.rule_type, ruleId: r.id });
      }
    }
    return Array.from(byBenefit.values());
  }, [benefitLinks, sharedAttrRules, card.id]);

  const cardBenefitIds = useMemo(() => cardEdges.map((e) => e.benefit_id), [cardEdges]);

  // PC-DEF-005 — governed benefit linkage, per-card audit history, effective context.
  const benefitNameById = useMemo(() => new Map(allBenefits.map((b) => [b.id, b.name])), [allBenefits]);
  const linkedBenefits = useMemo(() => benefitLinks.filter((l) => l.project_card_id === card.id), [benefitLinks, card.id]);
  const auditQ = useCardAudit(card.id);
  const auditEvents = auditQ.data ?? [];
  const closure = (card.optional_fields?.closure ?? null) as { type?: string; reason?: string; actor?: string; at?: string } | null;
  // PC-DEF-005 submit/approve governance — new columns not yet in generated types.
  const approval = card as unknown as {
    approval_status?: string | null; submitted_by?: string | null; approved_by?: string | null;
    submitted_at?: string | null; approved_at?: string | null; created_by?: string | null;
  };
  const currentUserId = useStrataUserId().data ?? null;
  const canSubmit = canWrite && !isTerminal && approval.approval_status !== 'approved' && approval.approval_status !== 'submitted';
  // Hide the guaranteed-to-fail approve action (SoD: approver ≠ creator ≠ submitter); server still enforces.
  const canApprove = canArchive && !isTerminal && approval.approval_status === 'submitted'
    && currentUserId != null && currentUserId !== approval.created_by && currentUserId !== approval.submitted_by;
  const benefitValueQueries = useQueries({
    queries: cardBenefitIds.map((bid) => ({
      queryKey: ['strata', 'benefit-values', bid],
      queryFn: () => valueApi.benefitValues(bid),
      staleTime: 30_000,
    })),
  });

  const reverseTrace = useMemo(() => {
    return cardEdges.map((edge, i) => {
      const benefit = allBenefits.find((b) => b.id === edge.benefit_id) ?? null;
      const portfolio = benefit?.portfolio_id ? portfolios.find((p) => p.id === benefit.portfolio_id) ?? null : null;
      const rows = (benefitValueQueries[i]?.data ?? []) as StrataBenefitValue[];
      const pick = (kind: StrataBenefitValue['value_kind']) => {
        const of = rows.filter((v) => v.value_kind === kind);
        return of.find((v) => v.period_id === activePeriod?.id) ?? of[0] ?? null;
      };
      const planned = pick('planned'); const forecast = pick('forecast'); const realized = pick('realized');
      const attributable = planned ? (planned.value * edge.pct) / 100 : null;
      const eligibleRealized = realized && countsTowardRealization(realized.validation_status)
        ? (realized.value * edge.pct) / 100 : null;
      const reportedRealized = realized && realized.validation_status === 'reported'
        ? (realized.value * edge.pct) / 100 : null;
      return { edge, benefit, portfolio, planned, forecast, realized, attributable, eligibleRealized, reportedRealized };
    });
    // benefitValueQueries is fresh each render; key on resolved-count + period.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardEdges, allBenefits, portfolios, activePeriod?.id, benefitValueQueries.map((q) => (q.data ? 1 : 0)).join('')]);

  const stakeTotal = useMemo(() => {
    const vals = reverseTrace.map((t) => t.attributable).filter((x): x is number => x != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  }, [reverseTrace]);
  const hasBenefit = cardEdges.length > 0;
  const periodLabel = activePeriod?.name ?? null;

  const milestoneColumns = useMemo<Column<StrataMilestone>[]>(() => [
    { id: 'name', label: 'Milestone', flex: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: T.text }}>{row.name}</span> },
    { id: 'due', label: 'Due', width: 11, cell: ({ row }) => (row.baseline_end ? <span style={{ color: T.subtle }}>{fmtDate(row.baseline_end)}</span> : <Dash />) },
    { id: 'forecast_actual', label: 'Forecast / actual', width: 20, cell: ({ row }) => <span style={{ color: T.subtle }}>Forecast {fmtDate(row.forecast_date)} · Actual {fmtDate(row.actual_date)}</span> },
    { id: 'progress', label: 'Progress', width: 12, cell: ({ row }) => { const f = asFraction(row.progress); return f == null ? <Dash /> : <ProgressBar value={f} aria-label={`Milestone progress ${Math.round(f * 100)}%`} />; } },
    { id: 'weight', label: 'Weight', width: 8, align: 'end', cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums', color: T.subtle }}>{row.weight}</span> },
    { id: 'source', label: 'Source', width: 10, cell: ({ row }) => (row.source_system ? <CatalystTag text={`${labelize(row.source_system)}${row.source_reference_key ? ` · ${row.source_reference_key}` : ''}`} /> : <Dash />) },
    { id: 'status', label: 'Status', width: 11, cell: ({ row }) => <StatusLozenge status={row.status} appearance={MILESTONE_STATUS[row.status] ?? 'default'} /> },
    ...(canWrite && !isTerminal ? [{
      id: 'actions', label: '', width: 8, align: 'end' as const,
      cell: ({ row }: { row: StrataMilestone }) => (
        <Button appearance="subtle" spacing="compact" onClick={() => { setEditMilestone(row); setForm('edit-milestone'); }}>Edit</Button>
      ),
    }] : []),
  ], [canWrite, isTerminal]);

  const dependencyColumns = useMemo<Column<StrataDependency>[]>(() => [
    { id: 'name', label: 'Dependency', flex: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: T.text }}>{row.name ?? row.description ?? labelize(row.dependency_type)}</span> },
    {
      id: 'direction', label: 'Direction', width: 10,
      cell: ({ row }) => <CatalystTag text={row.requesting_type === 'project_card' && row.requesting_id === card.id ? 'Requesting' : 'Serving'} />,
    },
    { id: 'serving_label', label: 'Serving department / team', width: 16, cell: ({ row }) => (row.serving_label ? <span style={{ color: T.text }}>{row.serving_label}</span> : <Dash />) },
    { id: 'owner', label: 'Owner', width: 12, cell: ({ row }) => (profileName(row.owner_id) ? <span style={{ color: T.subtle }}>{profileName(row.owner_id)}</span> : <Dash />) },
    { id: 'baseline', label: 'Baseline', width: 14, cell: ({ row }) => <span style={{ color: T.subtle }}>{fmtDate(row.baseline_start)} → {fmtDate(row.baseline_end)}</span> },
    { id: 'due_date', label: 'Due', width: 10, cell: ({ row }) => (row.due_date ? <span style={{ color: T.subtle }}>{fmtDate(row.due_date)}</span> : <Dash />) },
    { id: 'status', label: 'Status', width: 10, cell: ({ row }) => <StatusLozenge status={row.status} appearance={DEPENDENCY_STATUS[row.status] ?? 'default'} /> },
    { id: 'is_blocker', label: 'Blocker', width: 8, cell: ({ row }) => (row.is_blocker ? <Lozenge appearance="removed" isBold>Blocker</Lozenge> : null) },
    {
      id: 'impact', label: 'Impact / blocker note', width: 16,
      cell: ({ row }) => (row.impact ? <Tooltip content={row.impact}><span style={{ display: 'block', color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.impact}</span></Tooltip> : <Dash />),
    },
    ...(canWrite && !isTerminal ? [{
      id: 'actions', label: '', width: 8, align: 'end' as const,
      cell: ({ row }: { row: StrataDependency }) => (
        <Button appearance="subtle" spacing="compact" onClick={() => { setEditDependency(row); setForm('edit-dependency'); }}>Edit</Button>
      ),
    }] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canWrite, card.id, profilesQ.data]);

  const riskColumns = useMemo<Column<StrataRisk>[]>(() => [
    { id: 'title', label: 'Risk', flex: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: T.text }}>{row.title}</span> },
    { id: 'likelihood', label: 'Likelihood', width: 11, cell: ({ row }) => (row.likelihood ? <Lozenge appearance={RISK_LEVEL[row.likelihood]}>{labelize(row.likelihood)}</Lozenge> : <Dash />) },
    { id: 'impact', label: 'Impact', width: 11, cell: ({ row }) => (row.impact ? <Lozenge appearance={RISK_LEVEL[row.impact]}>{labelize(row.impact)}</Lozenge> : <Dash />) },
    { id: 'owner', label: 'Owner', width: 12, cell: ({ row }) => (profileName(row.owner_id) ? <span style={{ color: T.subtle }}>{profileName(row.owner_id)}</span> : <Dash />) },
    { id: 'target', label: 'Target', width: 11, cell: ({ row }) => (row.target_resolution_date ? <span style={{ color: T.subtle }}>{fmtDate(row.target_resolution_date)}</span> : <Dash />) },
    { id: 'status', label: 'Status', width: 11, cell: ({ row }) => <StatusLozenge status={row.status} appearance={RISK_STATUS[row.status] ?? 'default'} /> },
    ...(canWrite && !isTerminal ? [{
      id: 'actions', label: '', width: 8, align: 'end' as const,
      cell: ({ row }: { row: StrataRisk }) => (
        <Button appearance="subtle" spacing="compact" onClick={() => { setEditRisk(row); setForm('edit-risk'); }}>Edit</Button>
      ),
    }] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canWrite, profilesQ.data]);

  return (
    <div data-testid="strata-project-card-detail" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {actionError ? (
        <SectionMessage appearance="error" title="Action rejected"><p style={{ whiteSpace: 'pre-wrap' }}>{actionError}</p></SectionMessage>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <CatalystTag text={`${labelize(card.source_system)}${card.source_key ? ` · ${card.source_key}` : ''}`} />
        {card.reference_id ? <CatalystTag text={card.reference_id} /> : null}
        <StrataExecutionHealthLozenge health={card.calculated_health} />
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isTerminal ? (
            <CatalystTag text={`Locked · ${labelize(card.stage)}`} />
          ) : (
            <>
              {canSubmit ? <Button spacing="compact" onClick={() => setForm('submit')} testId="strata-project-submit-open">Submit for approval</Button> : null}
              {canApprove ? <Button spacing="compact" appearance="primary" onClick={() => setForm('approve')} testId="strata-project-approve-open">Approve</Button> : null}
              {canWrite ? <Button spacing="compact" onClick={() => setForm('edit')} testId="strata-project-edit-open">Edit</Button> : null}
              {canArchive ? <Button spacing="compact" onClick={() => setForm('complete')} testId="strata-project-complete-open">Complete</Button> : null}
              {canArchive ? <Button spacing="compact" appearance="subtle" onClick={() => setForm('cancel')} testId="strata-project-cancel-open">Cancel project</Button> : null}
              {canArchive ? <Button spacing="compact" appearance="subtle" onClick={() => setForm('archive')}>Archive</Button> : null}
            </>
          )}
        </span>
      </div>

      {/* Strategic role first (anchor 07) — what this card does for the strategy, then its chain. */}
      <section data-testid="strata-project-role" style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, padding: 'var(--ds-space-150) var(--ds-space-200)' }}>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', lineHeight: 1.5, color: T.text }}>
          {roleProse ?? `Delivery of ${card.name}.`}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-075) var(--ds-space-300)', marginTop: 'var(--ds-space-100)', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
          {linkedObjective ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>↑ Objective · <Button appearance="subtle" spacing="compact" onClick={() => window.location.assign(Routes.strata.strategy())}>{linkedObjective.name}</Button></span>
          ) : null}
          {theme ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>◈ Theme · <Button appearance="subtle" spacing="compact" onClick={() => window.location.assign(Routes.strata.strategy())}>{theme.name}</Button></span>
          ) : null}
          {projectKpis.length > 0 ? <span>◎ Affects · {projectKpis.map((k) => k.name).join(', ')}</span> : null}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0, 1fr) 360px', gap: 16, alignItems: 'start' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DetailPanel label="HEALTH & FORECAST" testId="strata-project-health">
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={captionStyle}>Progress</div>
                <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{derivedProgress == null ? '—' : `${Math.round(derivedProgress * 100)}%`}</div>
              </div>
              <div>
                <div style={captionStyle}>Baseline end</div>
                <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{fmtDate(card.calc_baseline_end)}</div>
              </div>
              <div>
                <div style={captionStyle}>Forecast end</div>
                <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: forecastLate ? 'var(--ds-text-danger)' : T.text }}>
                  {fmtDate(card.final_forecast_end)}{card.forecast_variance_days ? ` (${card.forecast_variance_days > 0 ? '+' : ''}${card.forecast_variance_days} days)` : ''}
                </div>
              </div>
              <div>
                <div style={captionStyle}>Variance</div>
                <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{card.variance_pct == null ? '—' : `${card.variance_pct > 0 ? '+' : ''}${Math.round(card.variance_pct)}%`}</div>
              </div>
              <div>
                <div style={captionStyle}>Forecast source</div>
                <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{card.system_forecast_end ? 'System (milestone roll-up)' : card.forecast_end ? 'Submitted' : '—'}</div>
              </div>
            </div>
            {derivedProgress == null ? null : <ProgressBar value={derivedProgress} aria-label={`Progress ${Math.round(derivedProgress * 100)}%`} />}
            {card.health_reason ? <p style={{ ...captionStyle, margin: 'var(--ds-space-100) 0 0', lineHeight: 1.5 }}>{card.health_reason}</p> : null}
          </DetailPanel>

          {threats.length > 0 ? (
            <DetailPanel label={`WHAT THREATENS THE FORECAST · ${threats.length}`} testId="strata-project-threats">
              <div style={{ marginBottom: 'var(--ds-space-050)', fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>Milestones · dependencies · risks · blockers, ranked by schedule impact.</div>
              {threats.map((t, i) => (
                <div key={`${t.kind}-${i}`} style={{ display: 'flex', gap: 12, padding: 'var(--ds-space-150) 0', borderTop: i === 0 ? undefined : `1px solid ${T.border}`, alignItems: 'flex-start' }}>
                  <span style={{ marginTop: 'var(--ds-space-025)', flexShrink: 0 }}><Lozenge appearance={t.tone} isBold>{t.kind}</Lozenge></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{t.title}</div>
                    {t.detail ? <div style={{ ...captionStyle, marginTop: 'var(--ds-space-025)' }}>{t.detail}</div> : null}
                  </div>
                  <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: t.impactDays > 0 ? 'var(--ds-text-danger)' : T.subtle, whiteSpace: 'nowrap', flexShrink: 0 }}>{t.impact}</span>
                </div>
              ))}
            </DetailPanel>
          ) : null}

          <Tabs id={`strata-project-detail-tabs-${card.id}`}>
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Scope &amp; Measures</Tab>
          <Tab>Delivery</Tab>
        </TabList>

        {/* Overview */}
        <TabPanel>
          <div style={{ width: '100%', paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            <SummaryField label="Project Name">{card.name}</SummaryField>
            <SummaryField label="Project Reference ID">{card.reference_id ?? <Dash />}</SummaryField>
            <SummaryField label="Strategic Theme">
              {theme
                ? <Button appearance="subtle" spacing="compact" onClick={() => window.location.assign(Routes.strata.strategy())}>{theme.name}</Button>
                : <Dash />}
            </SummaryField>
            <SummaryField label="Linked Strategic Objective">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {(() => {
                  const obj = card.objective_element_id
                    ? themeObjectives.find((o) => o.id === card.objective_element_id) ?? null
                    : null;
                  return obj
                    ? <Button appearance="subtle" spacing="compact" onClick={() => window.location.assign(Routes.strata.strategy())}>{obj.name}</Button>
                    : <Dash />;
                })()}
                {canWriteObjective && !isTerminal ? (
                  <Button appearance="subtle" spacing="compact" onClick={() => setForm('set-objective')} testId="strata-set-objective-open">
                    {card.objective_element_id ? 'Change' : 'Set objective'}
                  </Button>
                ) : null}
              </span>
            </SummaryField>
            <SummaryField label="Business Owner">
              {profileName(card.business_owner_id) ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Avatar size="xsmall" name={profileName(card.business_owner_id)!} />
                  {profileName(card.business_owner_id)}
                </span>
              ) : <Dash />}
            </SummaryField>
            <SummaryField label="Project Manager">
              {profileName(card.pm_id) ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Avatar size="xsmall" name={profileName(card.pm_id)!} />
                  {profileName(card.pm_id)}
                </span>
              ) : <Dash />}
            </SummaryField>
            <SummaryField label="Lead Business Unit">{card.lead_business_unit ?? <Dash />}</SummaryField>
            <SummaryField label="Delivery Team">{card.delivery_team ?? <Dash />}</SummaryField>
            <SummaryField label="Delivery Status">{card.stage ? labelize(card.stage) : <Dash />}</SummaryField>
            <SummaryField label="Calculated Delivery Health">
              <StrataExecutionHealthLozenge health={card.calculated_health} />
              <span style={{ ...captionStyle, display: 'block', marginTop: 4 }}>{card.health_reason ?? 'Server-calculated from milestone baseline/progress — never manual.'}</span>
            </SummaryField>
            <SummaryField label="Baseline Window (milestone-derived)">
              {card.calc_baseline_start || card.calc_baseline_end
                ? <>{fmtDate(card.calc_baseline_start)} → {fmtDate(card.calc_baseline_end)}</>
                : <Dash />}
            </SummaryField>
            <SummaryField label="System Forecast End">{card.system_forecast_end ? fmtDate(card.system_forecast_end) : <Dash />}</SummaryField>
            <SummaryField label="Submitted Forecast End">{card.forecast_end ? fmtDate(card.forecast_end) : <Dash />}</SummaryField>
            <SummaryField label="Final Forecast End">{card.final_forecast_end ? fmtDate(card.final_forecast_end) : <Dash />}</SummaryField>
            <SummaryField label="Forecast Variance (days)">
              {card.forecast_variance_days == null ? <Dash /> : `${card.forecast_variance_days > 0 ? '+' : ''}${card.forecast_variance_days}`}
            </SummaryField>
            {fieldVisible('budget') ? <SummaryField label="Budget">{card.budget != null ? fmtSarCompact(card.budget) : <Dash />}</SummaryField> : null}
            {fieldVisible('sponsor_id') ? <SummaryField label="Executive Sponsor">{profileName(card.sponsor_id) ?? <Dash />}</SummaryField> : null}
            {fieldVisible('business_case') ? <SummaryField label="Business Case">{card.business_case ?? <Dash />}</SummaryField> : null}
            {fieldVisible('value_hypothesis') ? <SummaryField label="Value Hypothesis">{card.value_hypothesis ?? <Dash />}</SummaryField> : null}
            {fieldVisible('strategic_pillar') ? <SummaryField label="Strategic Pillar">{(card.optional_fields.strategic_pillar as string) ?? <Dash />}</SummaryField> : null}
            {fieldVisible('aop_mapping') ? <SummaryField label="AOP Mapping">{(card.optional_fields.aop_mapping as string) ?? <Dash />}</SummaryField> : null}
            {fieldVisible('strategic_impact') ? <SummaryField label="Strategic Impact">{(card.optional_fields.strategic_impact as string) ?? <Dash />}</SummaryField> : null}
            {fieldVisible('risks') ? <SummaryField label="Risks">{(card.optional_fields.risks as string) ?? card.risk_summary ?? <Dash />}</SummaryField> : null}
          </div>
        </TabPanel>

        {/* Scope & Measures */}
        <TabPanel>
          <div style={{ width: '100%', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sectionVisible('scope_measures', 'scope_description') ? (
              <SummaryField label="Scope Description">{card.scope_description ?? <Dash />}</SummaryField>
            ) : null}

            {sectionVisible('scope_measures', 'project_objectives') ? (
              <TabSection
                title={`Project Objectives (${objectives.length})`}
                action={canWriteObjective && !isTerminal ? <Button spacing="compact" onClick={() => setForm('new-objective')} testId="strata-new-project-objective">New objective</Button> : undefined}
              >
                {objectives.length === 0 ? (
                  <EmptyState size="compact" header="No project objectives" description="Project Objectives use the same framework as Theme Objectives and may link upward to one." />
                ) : objectives.map((o) => (
                  <LinkedRow key={o.id} primary={o.name} meta={o.parent_id ? `Linked to theme objective` : 'Not linked to a theme objective'} canAct={false} />
                ))}
              </TabSection>
            ) : null}

            {sectionVisible('scope_measures', 'project_kpis') ? (
              <TabSection
                title={`Project KPIs / Measures (${projectKpis.length})`}
                action={canWriteKpi && !isTerminal ? <Button spacing="compact" onClick={() => setForm('new-kpi')} testId="strata-new-project-kpi">Link KPI</Button> : undefined}
              >
                {projectKpis.length === 0 ? (
                  <EmptyState size="compact" header="No project KPIs" description="Project KPIs / Measures use the same framework as Theme KPIs and may roll up to one." />
                ) : projectKpis.map((k) => {
                  const parentId = parentThemeKpiIdByProjectKpi.get(k.id);
                  const parentName = parentId ? themeKpiNameById.get(parentId) ?? null : null;
                  const baseMeta = `${labelize(k.direction)} · ${labelize(k.frequency)}${k.unit ? ` · ${k.unit}` : ''}`;
                  return (
                    <LinkedRow
                      key={k.id}
                      primary={k.name}
                      meta={parentName ? `${baseMeta} · Rolls up to ${parentName}` : baseMeta}
                      canAct={false}
                    />
                  );
                })}
              </TabSection>
            ) : null}

            {/* PC-DEF-005 — Linked Benefits (distinct from KPIs / objectives / milestones) */}
            <TabSection
              title={`Linked Benefits (${linkedBenefits.length})`}
              action={canWrite && !isTerminal ? <Button spacing="compact" onClick={() => setForm('link-benefit')} testId="strata-link-benefit-open">Link benefit</Button> : undefined}
            >
              {linkedBenefits.length === 0 ? (
                <EmptyState size="compact" header="No linked benefits" description="Link an existing governed benefit to attribute value to this project. Benefit definitions are never created here." />
              ) : linkedBenefits.map((l) => (
                <LinkedRow
                  key={l.id}
                  primary={benefitNameById.get(l.benefit_id) ?? '—'}
                  meta={l.attribution_share != null ? `Attribution ${l.attribution_share}%` : 'No attribution share set'}
                  canAct={canWrite && !isTerminal}
                  onAction={() => { void executionApi.unlinkBenefitProjectCard(l.benefit_id, card.id).then(() => invalidate()); }}
                />
              ))}
            </TabSection>

            {/* PC-DEF-005 — Version & effective context (truthful existing fields only) */}
            <TabSection title="Version & Effective Context">
              <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: 12 }}>
                <SummaryField label="Reference">{card.reference_id ?? <Dash />}</SummaryField>
                <SummaryField label="Lifecycle Stage">{card.stage ? labelize(card.stage) : <Dash />}</SummaryField>
                <SummaryField label="Effective Cycle">{activeCycle?.name ?? <Dash />}</SummaryField>
                <SummaryField label="Effective Period">{activePeriod?.name ?? <Dash />}</SummaryField>
                <SummaryField label="Created">{card.created_at ? fmtDate(card.created_at) : <Dash />}</SummaryField>
                <SummaryField label="Last Updated">{card.updated_at ? fmtDate(card.updated_at) : <Dash />}</SummaryField>
                <SummaryField label="Approval">{approval.approval_status ? labelize(approval.approval_status) : 'Unsubmitted'}</SummaryField>
                {approval.submitted_by ? (
                  <SummaryField label="Submitted By">{`${profileName(approval.submitted_by) ?? '—'}${approval.submitted_at ? ` · ${fmtDate(approval.submitted_at)}` : ''}`}</SummaryField>
                ) : null}
                {approval.approved_by ? (
                  <SummaryField label="Approved By">{`${profileName(approval.approved_by) ?? '—'}${approval.approved_at ? ` · ${fmtDate(approval.approved_at)}` : ''}`}</SummaryField>
                ) : null}
                {closure ? (
                  <SummaryField label="Closure">{`${labelize(closure.type ?? '')}${closure.reason ? ` · ${closure.reason}` : ''}${closure.at ? ` · ${fmtDate(closure.at)}` : ''}`}</SummaryField>
                ) : null}
              </div>
            </TabSection>

            {/* PC-DEF-005 — Audit history (read preserved for terminal cards) */}
            <TabSection title={`Audit History (${auditEvents.length})`}>
              {auditQ.isLoading ? (
                <span style={{ color: T.subtle, fontSize: 'var(--ds-font-size-100)' }}>Loading audit history…</span>
              ) : auditEvents.length === 0 ? (
                <EmptyState size="compact" header="No audit history" description="Governed actions on this project will appear here." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {auditEvents.map((e) => (
                    <div key={e.id} style={{ borderLeft: `2px solid ${T.border}`, paddingLeft: 10 }}>
                      <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.text }}>{labelize(String(e.action ?? '').replace(/^RPC:/, ''))}</div>
                      <div style={{ fontSize: 'var(--ds-font-size-075)', color: T.subtle }}>
                        {(profileName(e.actor_id) ?? 'System')}{e.created_at ? ` · ${fmtDate(e.created_at)}` : ''}{e.note ? ` · ${e.note}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabSection>

            {sectionVisible('scope_measures', 'target_outcomes') ? (
              <SummaryField label="Target Outcomes">{card.target_outcomes ?? <Dash />}</SummaryField>
            ) : null}
            {sectionVisible('scope_measures', 'success_criteria') ? (
              <SummaryField label="Success Criteria">{card.success_criteria ?? <Dash />}</SummaryField>
            ) : null}
          </div>
        </TabPanel>

        {/* Delivery */}
        <TabPanel>
          <div style={{ width: '100%', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sectionVisible('delivery', 'milestones') ? (
              <TabSection
                title={`Milestones (${milestones.length})`}
                action={canWrite && !isTerminal ? <Button spacing="compact" onClick={() => setForm('new-milestone')} testId="strata-new-milestone">New milestone</Button> : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...captionStyle, fontWeight: 600 }}>Project progress</span>
                  {derivedProgress == null ? <Dash /> : (
                    <>
                      <span style={{ flex: '0 1 240px', minWidth: 120 }}><ProgressBar value={derivedProgress} aria-label={`Execution progress ${Math.round(derivedProgress * 100)}%`} /></span>
                      <span style={{ ...captionStyle, fontWeight: 600, color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>{Math.round(derivedProgress * 100)}%</span>
                    </>
                  )}
                  <span style={captionStyle}>· recalculated by the server on every milestone write</span>
                </div>
                {milestones.length === 0 ? (
                  <EmptyState size="compact" header="No milestones" description="Milestones drive the server-calculated Delivery Health." />
                ) : (
                  <JiraTable<StrataMilestone> columns={milestoneColumns} data={milestones} getRowId={(r) => r.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel="Milestones" />
                )}
              </TabSection>
            ) : null}

            {sectionVisible('delivery', 'risks') ? (
              <TabSection
                title={`Risks (${risks.length})`}
                action={canWrite && !isTerminal ? <Button spacing="compact" onClick={() => { setEditRisk(null); setForm('new-risk'); }} testId="strata-new-risk">New risk</Button> : undefined}
              >
                {risks.length === 0 ? (
                  <EmptyState size="compact" header="No risks" description="Track delivery risks with a likelihood × impact assessment and mitigation." />
                ) : (
                  <JiraTable<StrataRisk> columns={riskColumns} data={risks} getRowId={(r) => r.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel="Risks" />
                )}
              </TabSection>
            ) : null}

            {sectionVisible('delivery', 'dependencies') ? (
              <TabSection
                title={`Blockers (${blockers.length})`}
                action={canWrite && !isTerminal ? <Button spacing="compact" onClick={() => setForm('new-blocker')} testId="strata-new-blocker">New blocker</Button> : undefined}
              >
                {blockers.length === 0 ? (
                  <EmptyState size="compact" header="No active blockers" description="Blocking dependencies in either direction surface here until resolved." />
                ) : (
                  <JiraTable<StrataDependency> columns={dependencyColumns} data={blockers} getRowId={(r) => r.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel="Blockers" />
                )}
              </TabSection>
            ) : null}

            {sectionVisible('delivery', 'dependencies') ? (
              <TabSection
                title={`Delivery Dependencies (${projectDependencies.length})`}
                action={canWrite && !isTerminal ? <Button spacing="compact" onClick={() => setForm('new-dependency')} testId="strata-new-project-dependency">New dependency</Button> : undefined}
              >
                {projectDependencies.length === 0 ? (
                  <EmptyState size="compact" header="No delivery dependencies" description="Dependencies where this project is requesting or serving appear here." />
                ) : (
                  <JiraTable<StrataDependency> columns={dependencyColumns} data={projectDependencies} getRowId={(r) => r.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel="Delivery dependencies" />
                )}
              </TabSection>
            ) : null}
          </div>
        </TabPanel>
          </Tabs>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'start', position: isNarrow ? 'static' : 'sticky', top: 16 }}>
          <DetailPanel label="DETAILS" testId="strata-project-details">
            {fieldVisible('sponsor_id') && profileName(card.sponsor_id) ? <RailField k="Sponsor">{profileName(card.sponsor_id)}</RailField> : null}
            <RailField k="Business owner">{profileName(card.business_owner_id) ?? <Dash />}</RailField>
            <RailField k="Project manager">{profileName(card.pm_id) ?? <Dash />}</RailField>
            <RailField k="Lead BU">{card.lead_business_unit ?? <Dash />}</RailField>
            <RailField k="Delivery team">{card.delivery_team ?? <Dash />}</RailField>
            <RailField k="Stage">{card.stage ? labelize(card.stage) : <Dash />}</RailField>
            {fieldVisible('budget') ? <RailField k="Budget">{card.budget != null ? fmtSarCompact(card.budget) : <Dash />}</RailField> : null}
            <RailField k="On hold">{card.calculated_health === 'on_hold' ? 'Yes' : 'No'}</RailField>
          </DetailPanel>

          <DetailPanel label="SOURCE SYSTEM" testId="strata-project-source">
            <RailField k="System">{labelize(card.source_system)}</RailField>
            {card.source_key ? <RailField k="Reference">{card.source_key}</RailField> : null}
            <RailField k="Last synced">{card.last_synced_at ? fmtDate(card.last_synced_at) : <Dash />}</RailField>
            <div style={{ marginTop: 8 }}>
              <Button appearance="subtle" spacing="compact" onClick={() => window.location.assign(Routes.strata.executionImport())}>View reconciliation →</Button>
            </div>
            <p style={{ ...captionStyle, margin: '8px 0 0', lineHeight: 1.5 }}>STRATA summarizes and links — the work items live in {labelize(card.source_system)}. This card never becomes a task tracker.</p>
          </DetailPanel>

          {hasBenefit ? (
            <DetailPanel label="BENEFIT TRACEABILITY" testId="strata-project-value">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 'var(--ds-space-100)', fontSize: 'var(--ds-font-size-200)' }}>
                <span style={{ color: T.subtle }}>Benefit at stake{periodLabel ? ` · ${periodLabel}` : ''}</span>
                <strong style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }} data-testid="strata-project-stake">
                  {stakeTotal == null ? '—' : fmtSarCompact(stakeTotal)}
                </strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-125)' }}>
                {reverseTrace.map((t) => (
                  <div key={t.edge.benefit_id} style={{ borderTop: `1px solid ${T.border}`, paddingTop: 'var(--ds-space-100)', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {t.benefit?.slug ? (
                        <Button appearance="link" spacing="none" onClick={() => window.location.assign(Routes.strata.benefit(t.benefit!.slug!))}>
                          {t.benefit?.name ?? 'Benefit'}
                        </Button>
                      ) : <span style={{ color: T.text, fontWeight: 600 }}>{t.benefit?.name ?? 'Benefit'}</span>}
                      {t.realized ? (
                        <StatusLozenge status={t.realized.validation_status} label={labelize(t.realized.validation_status)}
                          appearance={countsTowardRealization(t.realized.validation_status) ? 'success' : t.realized.validation_status === 'reported' ? 'moved' : 'removed'} />
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span>Portfolio</span>
                      {t.portfolio?.slug ? (
                        <Button appearance="link" spacing="none" onClick={() => window.location.assign(Routes.strata.portfolioDetail(t.portfolio!.slug!))}>{t.portfolio.name}</Button>
                      ) : <span style={{ color: T.text }}>{t.portfolio?.name ?? '—'}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Attribution rule</span><span style={{ color: T.text }}>{labelize(t.edge.ruleType)} · {t.edge.pct}%</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Source (planned)</span><span style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{t.planned == null ? '—' : `${fmtSarCompact(t.planned.value)} × ${t.edge.pct}%`}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Attributable</span><strong style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{t.attributable == null ? '—' : fmtSarCompact(t.attributable)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Forecast</span><span style={{ color: forecastLate ? 'var(--ds-text-danger)' : T.text, fontVariantNumeric: 'tabular-nums' }}>{t.forecast == null ? '—' : fmtSarCompact(t.forecast.value * t.edge.pct / 100)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Eligible realized</span><span style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{t.eligibleRealized == null ? '—' : fmtSarCompact(t.eligibleRealized)}</span></div>
                    {t.reportedRealized != null ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Reported (awaiting assurance)</span><span style={{ color: 'var(--ds-text-warning)', fontVariantNumeric: 'tabular-nums' }}>{fmtSarCompact(t.reportedRealized)}</span></div>
                    ) : null}
                  </div>
                ))}
              </div>
              <p style={{ ...captionStyle, margin: '8px 0 0', lineHeight: 1.5 }}>Attributable value uses the governed attribution rule — never inferred from portfolio membership. Eligible realized counts only assured values.</p>
            </DetailPanel>
          ) : null}
        </aside>
      </div>

      {/* ── Authoring modals ── */}
      <StrataFormModal
        open={form === 'edit'}
        onClose={() => setForm(null)}
        title="Edit project card"
        submitLabel="Save"
        fields={[
          { key: 'name', label: 'Project Name', kind: 'text', required: true },
          // Strategic Theme is mandatory on Edit exactly as on Create — a card must
          // always belong to a Theme. isClearable:true exposes the clear control so the
          // required-link integrity is provable in the browser: clearing it and pressing
          // Save triggers the required-field rejection (StrataFormModal blocks submit on
          // an empty required field) rather than silently hiding the affordance
          // (V6-OPEN-027). Server also rejects a null result (see strata_update_project_card guard migration).
          { key: 'themeId', label: 'Strategic Theme', kind: 'select', required: true, isClearable: true, options: themeElements.map((t) => ({ value: t.id, label: t.name })) },
          { key: 'businessOwnerId', label: 'Business Owner', kind: 'user' },
          { key: 'pmId', label: 'Project Manager', kind: 'user' },
          { key: 'leadBusinessUnit', label: 'Lead Business Unit', kind: 'select', options: (lobPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label })) },
          { key: 'deliveryTeam', label: 'Delivery Team', kind: 'select', options: (teamPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label })) },
          { key: 'sector', label: 'Department / Sector', kind: 'select', options: (sectorPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label })) },
          { key: 'stage', label: 'Delivery Status', kind: 'select', options: (deliveryStatusPicklistQ.data ?? []).filter((p) => !TERMINAL_STAGES.includes(p.value)).map((p) => ({ value: p.value, label: p.label })), helper: 'Completion, cancellation and archival are governed actions — use the buttons above.' },
          { key: 'baselineStart', label: 'Baseline start', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline end', kind: 'date' },
          { key: 'forecastEnd', label: 'Forecast end', kind: 'date' },
          { key: 'scopeDescription', label: 'Scope Description', kind: 'textarea' },
          { key: 'targetOutcomes', label: 'Target Outcomes', kind: 'textarea' },
          { key: 'successCriteria', label: 'Success Criteria', kind: 'textarea' },
          { key: 'budget', label: 'Budget (optional)', kind: 'number', min: 0 },
          { key: 'sponsorId', label: 'Executive Sponsor (optional)', kind: 'user' },
          { key: 'businessCase', label: 'Business Case (optional)', kind: 'textarea' },
          { key: 'valueHypothesis', label: 'Value Hypothesis (optional)', kind: 'textarea' },
        ]}
        initial={{
          name: card.name, themeId: card.theme_id, businessOwnerId: card.business_owner_id, pmId: card.pm_id,
          leadBusinessUnit: card.lead_business_unit, deliveryTeam: card.delivery_team, sector: card.sector, stage: card.stage,
          baselineStart: card.baseline_start, baselineEnd: card.baseline_end, forecastEnd: card.forecast_end,
          scopeDescription: card.scope_description, targetOutcomes: card.target_outcomes, successCriteria: card.success_criteria,
          budget: card.budget, sponsorId: card.sponsor_id, businessCase: card.business_case, valueHypothesis: card.value_hypothesis,
        }}
        onSubmit={submitAndRefresh((v) => executionApi.updateProjectCard(card.id, {
          name: fvStr(v.name), themeId: fvStr(v.themeId), businessOwnerId: fvStr(v.businessOwnerId), pmId: fvStr(v.pmId),
          leadBusinessUnit: fvStr(v.leadBusinessUnit), deliveryTeam: fvStr(v.deliveryTeam), sector: fvStr(v.sector), stage: fvStr(v.stage),
          baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd), forecastEnd: fvStr(v.forecastEnd),
          scopeDescription: fvStr(v.scopeDescription), targetOutcomes: fvStr(v.targetOutcomes), successCriteria: fvStr(v.successCriteria),
          budget: fvNum(v.budget), sponsorId: fvStr(v.sponsorId), businessCase: fvStr(v.businessCase), valueHypothesis: fvStr(v.valueHypothesis),
          clearPm: wasCleared(card.pm_id, v.pmId), clearBusinessOwner: wasCleared(card.business_owner_id, v.businessOwnerId),
          clearSponsor: wasCleared(card.sponsor_id, v.sponsorId), clearTheme: wasCleared(card.theme_id, v.themeId),
          // Optimistic-concurrency token captured when the modal opened — a stale
          // second save is rejected with a conflict message (V6-OPEN-033).
          expectedUpdatedAt: card.updated_at,
        }))}
        testId="strata-project-edit-modal"
      />

      <StrataFormModal
        open={form === 'archive'}
        onClose={() => setForm(null)}
        title="Archive project card"
        description="A reason is required and is written to the audit trail."
        submitLabel="Archive"
        fields={[{ key: 'reason', label: 'Reason', kind: 'textarea', required: true }]}
        onSubmit={submitAndRefresh((v) => executionApi.archiveProjectCard(card.id, String(v.reason ?? '').trim()))}
        testId="strata-project-archive-modal"
      />

      <StrataFormModal
        open={form === 'complete'}
        onClose={() => setForm(null)}
        title="Complete project"
        description="Governed closure. The server verifies alignment (primary objective), ownership (Business Owner + PM), baselined dates, all milestones resolved, no open risks or blocking dependencies, and separation of duties before the project is completed. A reason is required and audited."
        submitLabel="Complete project"
        fields={[{ key: 'reason', label: 'Completion reason', kind: 'textarea', required: true }]}
        onSubmit={submitAndRefresh((v) => executionApi.completeProjectCard(card.id, String(v.reason ?? '').trim()))}
        testId="strata-project-complete-modal"
      />

      <StrataFormModal
        open={form === 'cancel'}
        onClose={() => setForm(null)}
        title="Cancel project"
        description="Governed cancellation of an abandoned project. Records the reason, actor and audit, and freezes the project history (terminal). Distinct from archive."
        submitLabel="Cancel project"
        fields={[{ key: 'reason', label: 'Cancellation reason', kind: 'textarea', required: true }]}
        onSubmit={submitAndRefresh((v) => executionApi.cancelProjectCard(card.id, String(v.reason ?? '').trim()))}
        testId="strata-project-cancel-modal"
      />

      <StrataFormModal
        open={form === 'set-objective'}
        onClose={() => setForm(null)}
        title="Set primary Strategic Objective"
        description="A governed project must align to exactly one primary Strategic Objective within its Theme; the Theme is retained as context. A project cannot advance beyond planning until aligned."
        submitLabel="Link objective"
        fields={[{
          key: 'objectiveId', label: 'Strategic Objective', kind: 'select', required: true,
          options: themeObjectives.filter((o) => o.parent_id === card.theme_id).map((o) => ({ value: o.id, label: o.name })),
          helper: 'Only objectives within this project’s Theme are eligible.',
        }]}
        initial={card.objective_element_id ? { objectiveId: card.objective_element_id } : undefined}
        onSubmit={submitAndRefresh((v) => executionApi.linkCardObjective(card.id, String(v.objectiveId ?? '')))}
        testId="strata-project-set-objective-modal"
      />

      <StrataFormModal
        open={form === 'link-benefit'}
        onClose={() => setForm(null)}
        title="Link governed benefit"
        description="Attribute value to this project by linking an existing governed benefit. Benefit definitions and realized values are never changed here."
        submitLabel="Link benefit"
        fields={[
          {
            key: 'benefitId', label: 'Governed benefit', kind: 'select', required: true,
            options: allBenefits.filter((b) => !linkedBenefits.some((l) => l.benefit_id === b.id)).map((b) => ({ value: b.id, label: b.name })),
            helper: allBenefits.length === 0 ? 'No governed benefits are available to link.' : 'Select an existing benefit from the governed dictionary.',
          },
          { key: 'attributionShare', label: 'Attribution share (%)', kind: 'text', helper: 'Optional — 0 to 100.' },
        ]}
        onSubmit={submitAndRefresh((v) => executionApi.linkBenefitProjectCard(
          String(v.benefitId ?? ''), card.id,
          fvStr(v.attributionShare) ? Number(fvStr(v.attributionShare)) : undefined,
        ))}
        testId="strata-project-link-benefit-modal"
      />

      <StrataFormModal
        open={form === 'submit'}
        onClose={() => setForm(null)}
        title="Submit project for approval"
        description="Submits this project for governance approval. The server requires a primary Strategic Objective, a Business Owner and a Project Manager first. The approver must be someone other than you and the creator."
        submitLabel="Submit for approval"
        fields={[{ key: 'reason', label: 'Submission reason', kind: 'textarea', required: true }]}
        onSubmit={submitAndRefresh((v) => executionApi.submitProjectCard(card.id, String(v.reason ?? '').trim()))}
        testId="strata-project-submit-modal"
      />

      <StrataFormModal
        open={form === 'approve'}
        onClose={() => setForm(null)}
        title="Approve project"
        description="Approves this submitted project. Segregation of duties is enforced on the server — you cannot approve a project you created or submitted. A reason is recorded to the audit trail."
        submitLabel="Approve project"
        fields={[{ key: 'reason', label: 'Approval reason', kind: 'textarea', required: true }]}
        onSubmit={submitAndRefresh((v) => executionApi.approveProjectCard(card.id, String(v.reason ?? '').trim()))}
        testId="strata-project-approve-modal"
      />

      <StrataFormModal
        open={form === 'new-objective'}
        onClose={() => setForm(null)}
        title="New project objective"
        description="Uses the same objective framework as Theme Objectives."
        submitLabel="Create"
        fields={[
          { key: 'name', label: 'Objective', kind: 'text', required: true },
          { key: 'description', label: 'Description', kind: 'textarea' },
          {
            key: 'parentThemeObjectiveId', label: 'Link to Theme Objective', kind: 'select',
            options: themeObjectives.map((o) => ({ value: o.id, label: o.name })),
            helper: 'Optional — links this Project Objective upward',
          },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
        ]}
        onSubmit={submitAndRefresh((v) => executionApi.createProjectObjective({
          projectId: card.id, name: String(v.name ?? '').trim(), description: fvStr(v.description),
          parentThemeObjectiveId: fvStr(v.parentThemeObjectiveId), ownerId: fvStr(v.ownerId),
        }))}
        testId="strata-project-objective-create-modal"
      />

      <StrataFormModal
        open={form === 'new-kpi'}
        onClose={() => setForm(null)}
        title="Link governed KPI / measure"
        description="Project Cards reuse an approved KPI from the governed dictionary. Contribution and target context are recorded on the link — no new KPI is created and official KPI/Scorecard results are unchanged."
        submitLabel="Link measure"
        fields={[
          {
            key: 'kpiId', label: 'Governed KPI', kind: 'select', required: true,
            options: approvedKpis.map((k) => ({ value: k.id, label: k.name })),
            helper: approvedKpis.length === 0
              ? 'No approved governed KPIs are available to reuse yet.'
              : 'Select an approved KPI from the governed dictionary',
          },
          {
            key: 'contribution', label: 'Contribution', kind: 'select',
            options: [{ value: 'direct', label: 'Direct' }, { value: 'supporting', label: 'Supporting' }],
          },
          {
            key: 'targetNote', label: 'Contribution / target context', kind: 'text',
            helper: 'Optional — how this project contributes to the KPI (stored on the link, not the KPI definition)',
          },
          {
            key: 'parentThemeKpiId', label: 'Roll up to Theme KPI', kind: 'select',
            options: themeKpis.map((k) => ({ value: k.id, label: k.name })),
            helper: 'Optional — links this measure upward',
          },
        ]}
        initial={{ contribution: 'supporting' }}
        onSubmit={submitAndRefresh((v) => executionApi.linkProjectKpi({
          projectId: card.id, kpiId: String(v.kpiId ?? ''),
          contribution: fvStr(v.contribution), targetNote: fvStr(v.targetNote),
          parentThemeKpiId: fvStr(v.parentThemeKpiId),
        }))}
        testId="strata-project-kpi-create-modal"
      />

      <StrataFormModal
        open={form === 'new-milestone'}
        onClose={() => setForm(null)}
        title="New milestone"
        description="Milestone writes recalculate Delivery Health on the server."
        submitLabel="Create"
        fields={[
          { key: 'name', label: 'Milestone Name', kind: 'text', required: true },
          { key: 'ownerId', label: 'Milestone Owner', kind: 'user' },
          { key: 'baselineStart', label: 'Baseline Start Date', kind: 'date', helper: 'Add both baseline dates to unlock schedule health & variance. Progress still rolls up by Weight without them.' },
          { key: 'baselineEnd', label: 'Baseline End Date', kind: 'date' },
          { key: 'forecastDate', label: 'Forecast End Date', kind: 'date' },
          { key: 'actualDate', label: 'Actual End Date', kind: 'date' },
          { key: 'status', label: 'Status', kind: 'select', options: MILESTONE_STATUS_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'progress', label: 'Progress %', kind: 'number', min: 0, max: 100 },
          { key: 'weight', label: 'Weight', kind: 'number', min: 0, helper: 'Relative weight for progress roll-up (default 1).' },
        ]}
        initial={{ status: 'planned' }}
        onSubmit={submitAndRefresh((v) => {
          assertUniqueMilestoneName(String(v.name ?? ''));
          return executionApi.createMilestone({
            projectId: card.id, name: String(v.name ?? '').trim(), ownerId: fvStr(v.ownerId),
            baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd),
            forecastDate: fvStr(v.forecastDate), actualDate: fvStr(v.actualDate),
            status: fvStr(v.status), progress: fvNum(v.progress), weight: fvNum(v.weight),
          });
        })}
        testId="strata-milestone-create-modal"
      />

      <StrataFormModal
        open={form === 'edit-milestone' && editMilestone != null}
        onClose={() => { setForm(null); setEditMilestone(null); }}
        title="Edit milestone"
        submitLabel="Save"
        fields={[
          { key: 'name', label: 'Milestone Name', kind: 'text', required: true },
          { key: 'ownerId', label: 'Milestone Owner', kind: 'user' },
          { key: 'baselineStart', label: 'Baseline Start Date', kind: 'date', helper: 'Add both baseline dates to unlock schedule health & variance. Progress still rolls up by Weight without them.' },
          { key: 'baselineEnd', label: 'Baseline End Date', kind: 'date' },
          { key: 'forecastDate', label: 'Forecast End Date', kind: 'date' },
          { key: 'actualDate', label: 'Actual End Date', kind: 'date' },
          { key: 'status', label: 'Status', kind: 'select', options: MILESTONE_STATUS_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'progress', label: 'Progress %', kind: 'number', min: 0, max: 100 },
          { key: 'weight', label: 'Weight', kind: 'number', min: 0, helper: 'Relative weight for progress roll-up (default 1).' },
        ]}
        initial={editMilestone ? {
          name: editMilestone.name, ownerId: editMilestone.owner_id,
          baselineStart: editMilestone.baseline_start, baselineEnd: editMilestone.baseline_end,
          forecastDate: editMilestone.forecast_date, actualDate: editMilestone.actual_date,
          status: editMilestone.status, progress: editMilestone.progress, weight: editMilestone.weight,
        } : undefined}
        onSubmit={submitAndRefresh((v) => {
          assertUniqueMilestoneName(String(v.name ?? ''), editMilestone!.id);
          return executionApi.updateMilestone(editMilestone!.id, {
            name: fvStr(v.name), ownerId: fvStr(v.ownerId),
            baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd),
            forecastDate: fvStr(v.forecastDate), actualDate: fvStr(v.actualDate),
            status: fvStr(v.status), progress: fvNum(v.progress), weight: fvNum(v.weight),
          });
        })}
        testId="strata-milestone-edit-modal"
      />

      <StrataFormModal
        open={form === 'new-dependency' || form === 'new-blocker'}
        onClose={() => setForm(null)}
        title={form === 'new-blocker' ? 'New blocker' : 'New delivery dependency'}
        description={form === 'new-blocker'
          ? `A blocker is a delivery dependency flagged as blocking. Requesting project: "${card.name}".`
          : `Requesting project: "${card.name}".`}
        submitLabel="Create"
        fields={[
          { key: 'dependencyName', label: 'Dependency Name', kind: 'text' },
          { key: 'description', label: 'Dependency Description', kind: 'textarea' },
          { key: 'servingLabel', label: 'Serving Department / Team', kind: 'text', required: true },
          { key: 'dependencyType', label: 'Dependency Type', kind: 'select', required: true, options: DEPENDENCY_TYPE_OPTIONS.map((t) => ({ value: t, label: labelize(t) })) },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'baselineStart', label: 'Baseline Start Date', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline End Date', kind: 'date' },
          { key: 'dueDate', label: 'Due date', kind: 'date' },
          { key: 'impact', label: 'Blocker / Impact Note', kind: 'textarea' },
          { key: 'isBlocker', label: 'Blocker', kind: 'checkbox', placeholder: 'This dependency blocks delivery' },
        ]}
        initial={{ dependencyType: 'delivery', isBlocker: form === 'new-blocker' }}
        onSubmit={submitAndRefresh((v) => executionApi.createDependency({
          requestingType: 'project_card', requestingId: card.id,
          servingType: 'external', servingLabel: fvStr(v.servingLabel),
          name: fvStr(v.dependencyName), description: fvStr(v.description),
          dependencyType: fvStr(v.dependencyType), ownerId: fvStr(v.ownerId),
          baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd), dueDate: fvStr(v.dueDate),
          impact: fvStr(v.impact), isBlocker: Boolean(v.isBlocker),
        }))}
        testId="strata-project-dependency-create-modal"
      />

      <StrataFormModal
        open={form === 'edit-dependency' && editDependency != null}
        onClose={() => { setForm(null); setEditDependency(null); }}
        title="Edit delivery dependency"
        submitLabel="Save"
        fields={[
          { key: 'dependencyName', label: 'Dependency Name', kind: 'text' },
          { key: 'description', label: 'Dependency Description', kind: 'textarea' },
          { key: 'status', label: 'Status', kind: 'select', required: true, options: DEPENDENCY_STATUS_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'baselineStart', label: 'Baseline Start Date', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline End Date', kind: 'date' },
          { key: 'dueDate', label: 'Due date', kind: 'date' },
          { key: 'impact', label: 'Blocker / Impact Note', kind: 'textarea' },
          { key: 'isBlocker', label: 'Blocker', kind: 'checkbox', placeholder: 'This dependency blocks delivery' },
          { key: 'servingLabel', label: 'Serving Department / Team', kind: 'text' },
        ]}
        initial={editDependency ? {
          dependencyName: editDependency.name, description: editDependency.description,
          status: editDependency.status, ownerId: editDependency.owner_id,
          baselineStart: editDependency.baseline_start, baselineEnd: editDependency.baseline_end, dueDate: editDependency.due_date,
          impact: editDependency.impact, isBlocker: editDependency.is_blocker, servingLabel: editDependency.serving_label,
        } : undefined}
        onSubmit={submitAndRefresh((v) => executionApi.updateDependency(editDependency!.id, {
          name: fvStr(v.dependencyName), description: fvStr(v.description), status: fvStr(v.status), ownerId: fvStr(v.ownerId),
          baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd), dueDate: fvStr(v.dueDate),
          impact: fvStr(v.impact), isBlocker: Boolean(v.isBlocker), servingLabel: fvStr(v.servingLabel),
          clearOwner: wasCleared(editDependency?.owner_id, v.ownerId),
        }))}
        testId="strata-project-dependency-edit-modal"
      />

      <StrataFormModal
        open={form === 'new-risk'}
        onClose={() => setForm(null)}
        title="New risk"
        description={`Delivery risk for "${card.name}".`}
        submitLabel="Create"
        fields={[
          { key: 'title', label: 'Risk Title', kind: 'text', required: true },
          { key: 'description', label: 'Description', kind: 'textarea' },
          { key: 'likelihood', label: 'Likelihood', kind: 'select', options: RISK_LEVEL_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'impact', label: 'Impact', kind: 'select', options: RISK_LEVEL_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'status', label: 'Status', kind: 'select', options: RISK_STATUS_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'mitigation', label: 'Mitigation', kind: 'textarea' },
          { key: 'targetDate', label: 'Target Resolution Date', kind: 'date' },
        ]}
        initial={{ status: 'open' }}
        onSubmit={submitAndRefresh((v) => executionApi.createRisk({
          projectId: card.id, title: String(v.title ?? '').trim(), description: fvStr(v.description),
          likelihood: fvStr(v.likelihood), impact: fvStr(v.impact), status: fvStr(v.status),
          ownerId: fvStr(v.ownerId), mitigation: fvStr(v.mitigation), targetDate: fvStr(v.targetDate),
        }))}
        testId="strata-risk-create-modal"
      />

      <StrataFormModal
        open={form === 'edit-risk' && editRisk != null}
        onClose={() => { setForm(null); setEditRisk(null); }}
        title="Edit risk"
        submitLabel="Save"
        fields={[
          { key: 'title', label: 'Risk Title', kind: 'text', required: true },
          { key: 'description', label: 'Description', kind: 'textarea' },
          { key: 'likelihood', label: 'Likelihood', kind: 'select', options: RISK_LEVEL_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'impact', label: 'Impact', kind: 'select', options: RISK_LEVEL_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'status', label: 'Status', kind: 'select', required: true, options: RISK_STATUS_OPTIONS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'mitigation', label: 'Mitigation', kind: 'textarea' },
          { key: 'targetDate', label: 'Target Resolution Date', kind: 'date' },
        ]}
        initial={editRisk ? {
          title: editRisk.title, description: editRisk.description,
          likelihood: editRisk.likelihood, impact: editRisk.impact, status: editRisk.status,
          ownerId: editRisk.owner_id, mitigation: editRisk.mitigation, targetDate: editRisk.target_resolution_date,
        } : undefined}
        onSubmit={submitAndRefresh((v) => executionApi.updateRisk(editRisk!.id, {
          title: fvStr(v.title), description: fvStr(v.description),
          likelihood: fvStr(v.likelihood), impact: fvStr(v.impact), status: fvStr(v.status),
          ownerId: fvStr(v.ownerId), mitigation: fvStr(v.mitigation), targetDate: fvStr(v.targetDate),
          clearOwner: wasCleared(editRisk?.owner_id, v.ownerId),
        }))}
        testId="strata-risk-edit-modal"
      />
    </div>
  );
}
