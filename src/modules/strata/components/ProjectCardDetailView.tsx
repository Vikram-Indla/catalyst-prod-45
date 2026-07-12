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
import React, { useMemo, useState } from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import {
  Avatar, Button, CatalystTag, EmptyState, Lozenge, ProgressBar, SectionMessage, Tooltip,
} from '@/components/ads';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { executionApi } from '../domain';
import {
  useDependencies, useExecutionLinks, useMilestones, useProfileNames, useProjectCardFieldConfigs,
  useProjectCardPicklists, useProjectCardSectionConfigs, useProjectKpis,
  useProjectObjectives, useInvalidateStrata, useKpis, useRisks, useStrataContext, useStrataRoles,
  useStrategyElements,
} from '../hooks/useStrata';
import type {
  StrataDependency, StrataMilestone, StrataProjectCard, StrataRisk, StrataRole, StrataStrategyElement,
} from '../types';
import { fmtDate, fmtSarCompact, labelize } from './format';
import { StrataFormModal } from './authoring';
import type { StrataFormValues } from './authoring';
import { StrataExecutionHealthLozenge, StrataPanel, StrataStatStrip, T } from './shared';

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
const KPI_DIRECTION_OPTIONS = ['higher_better', 'lower_better', 'band', 'manual'];
const KPI_FREQUENCY_OPTIONS = ['weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'];

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

type FormKey =
  | 'edit' | 'archive'
  | 'new-milestone' | 'edit-milestone'
  | 'new-dependency' | 'edit-dependency' | 'new-blocker'
  | 'new-risk' | 'edit-risk'
  | 'new-objective' | 'new-kpi'
  | null;

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
  const { activeCycle } = useStrataContext();

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

  const milestoneColumns = useMemo<Column<StrataMilestone>[]>(() => [
    { id: 'name', label: 'Milestone', flex: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: T.text }}>{row.name}</span> },
    { id: 'due', label: 'Due', width: 11, cell: ({ row }) => (row.baseline_end ? <span style={{ color: T.subtle }}>{fmtDate(row.baseline_end)}</span> : <Dash />) },
    { id: 'forecast_actual', label: 'Forecast / actual', width: 20, cell: ({ row }) => <span style={{ color: T.subtle }}>Forecast {fmtDate(row.forecast_date)} · Actual {fmtDate(row.actual_date)}</span> },
    { id: 'progress', label: 'Progress', width: 12, cell: ({ row }) => { const f = asFraction(row.progress); return f == null ? <Dash /> : <ProgressBar value={f} aria-label={`Milestone progress ${Math.round(f * 100)}%`} />; } },
    { id: 'weight', label: 'Weight', width: 8, align: 'end', cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums', color: T.subtle }}>{row.weight}</span> },
    { id: 'source', label: 'Source', width: 10, cell: ({ row }) => (row.source_system ? <CatalystTag text={`${labelize(row.source_system)}${row.source_reference_key ? ` · ${row.source_reference_key}` : ''}`} /> : <Dash />) },
    { id: 'status', label: 'Status', width: 11, cell: ({ row }) => <StatusLozenge status={row.status} appearance={MILESTONE_STATUS[row.status] ?? 'default'} /> },
    ...(canWrite ? [{
      id: 'actions', label: '', width: 8, align: 'end' as const,
      cell: ({ row }: { row: StrataMilestone }) => (
        <Button appearance="subtle" spacing="compact" onClick={() => { setEditMilestone(row); setForm('edit-milestone'); }}>Edit</Button>
      ),
    }] : []),
  ], [canWrite]);

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
    ...(canWrite ? [{
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
    ...(canWrite ? [{
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
          {canWrite ? <Button spacing="compact" onClick={() => setForm('edit')} testId="strata-project-edit-open">Edit</Button> : null}
          {canArchive ? <Button spacing="compact" appearance="subtle" onClick={() => setForm('archive')}>Archive</Button> : null}
        </span>
      </div>

      <StrataStatStrip
        items={[
          { key: 'progress', label: 'Actual progress', value: derivedProgress == null ? '—' : `${Math.round(derivedProgress * 100)}%` },
          { key: 'baseline_progress', label: 'Baseline progress', value: card.baseline_progress_pct == null ? '—' : `${Math.round(card.baseline_progress_pct)}%` },
          { key: 'variance', label: 'Variance', value: card.variance_pct == null ? '—' : `${card.variance_pct > 0 ? '+' : ''}${Math.round(card.variance_pct)}%` },
          { key: 'milestones', label: 'Milestones', value: milestones.length },
          { key: 'dependencies', label: 'Dependencies', value: projectDependencies.length },
          { key: 'blockers', label: 'Blockers', value: blockers.length },
        ]}
      />

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
              {(() => {
                const obj = card.objective_element_id
                  ? themeObjectives.find((o) => o.id === card.objective_element_id) ?? null
                  : null;
                return obj
                  ? <Button appearance="subtle" spacing="compact" onClick={() => window.location.assign(Routes.strata.strategy())}>{obj.name}</Button>
                  : <Dash />;
              })()}
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
            <SummaryField label="Source System">{labelize(card.source_system)}</SummaryField>
            <SummaryField label="Source Reference Key">{card.source_key ?? <Dash />}</SummaryField>
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
                action={canWriteObjective ? <Button spacing="compact" onClick={() => setForm('new-objective')} testId="strata-new-project-objective">New objective</Button> : undefined}
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
                action={canWriteKpi ? <Button spacing="compact" onClick={() => setForm('new-kpi')} testId="strata-new-project-kpi">New KPI</Button> : undefined}
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
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('new-milestone')} testId="strata-new-milestone">New milestone</Button> : undefined}
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
                action={canWrite ? <Button spacing="compact" onClick={() => { setEditRisk(null); setForm('new-risk'); }} testId="strata-new-risk">New risk</Button> : undefined}
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
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('new-blocker')} testId="strata-new-blocker">New blocker</Button> : undefined}
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
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('new-dependency')} testId="strata-new-project-dependency">New dependency</Button> : undefined}
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

      {/* ── Authoring modals ── */}
      <StrataFormModal
        open={form === 'edit'}
        onClose={() => setForm(null)}
        title="Edit project card"
        submitLabel="Save"
        fields={[
          { key: 'name', label: 'Project Name', kind: 'text', required: true },
          // Strategic Theme is mandatory on Edit exactly as on Create — a card must
          // always belong to a Theme. required:true makes the select non-clearable in
          // StrataFormModal and blocks submit if emptied (V6-OPEN-027). Server also
          // rejects a null result (see strata_update_project_card guard migration).
          { key: 'themeId', label: 'Strategic Theme', kind: 'select', required: true, options: themeElements.map((t) => ({ value: t.id, label: t.name })) },
          { key: 'businessOwnerId', label: 'Business Owner', kind: 'user' },
          { key: 'pmId', label: 'Project Manager', kind: 'user' },
          { key: 'leadBusinessUnit', label: 'Lead Business Unit', kind: 'select', options: (lobPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label })) },
          { key: 'deliveryTeam', label: 'Delivery Team', kind: 'select', options: (teamPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label })) },
          { key: 'sector', label: 'Department / Sector', kind: 'select', options: (sectorPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label })) },
          { key: 'stage', label: 'Delivery Status', kind: 'select', options: (deliveryStatusPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label })) },
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
        title="New project KPI / measure"
        description="Uses the same KPI framework as Theme KPIs."
        submitLabel="Create"
        fields={[
          { key: 'name', label: 'Measure name', kind: 'text', required: true },
          { key: 'unit', label: 'Unit of measure', kind: 'text' },
          { key: 'direction', label: 'Directionality', kind: 'select', options: KPI_DIRECTION_OPTIONS.map((d) => ({ value: d, label: labelize(d) })) },
          { key: 'frequency', label: 'Measurement frequency', kind: 'select', options: KPI_FREQUENCY_OPTIONS.map((f) => ({ value: f, label: labelize(f) })) },
          {
            key: 'parentThemeKpiId', label: 'Roll up to Theme KPI', kind: 'select',
            options: themeKpis.map((k) => ({ value: k.id, label: k.name })),
            helper: 'Optional — links this Project KPI upward',
          },
          { key: 'accountableOwnerId', label: 'Measure Owner', kind: 'user' },
          { key: 'validatorId', label: 'Validator', kind: 'user', helper: 'Must differ from the measure owner' },
        ]}
        initial={{ direction: 'higher_better', frequency: 'quarterly' }}
        onSubmit={submitAndRefresh((v) => executionApi.createProjectKpi({
          projectId: card.id, name: String(v.name ?? '').trim(), unit: fvStr(v.unit),
          direction: fvStr(v.direction), frequency: fvStr(v.frequency), entryMethod: 'manual',
          parentThemeKpiId: fvStr(v.parentThemeKpiId), accountableOwnerId: fvStr(v.accountableOwnerId),
          validatorId: fvStr(v.validatorId),
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
