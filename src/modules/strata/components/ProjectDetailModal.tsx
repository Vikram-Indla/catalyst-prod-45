/**
 * STRATA project-card detail modal — tabbed full-screen surface (Lane D,
 * CAT-STRATA-20260705-001 functional recovery).
 *
 * Tabs: Summary · Milestones · Dependencies · Links · Initiatives.
 * Milestone writes trigger the server-side milestone-weighted progress recalc
 * (strata_calculated_values + project_cards.actual_progress) — the UI only
 * invalidates and re-reads; derived progress is never typed here.
 * Server-validated RPCs throughout; rejections surface verbatim.
 */
import React, { useMemo, useState } from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import {
  Button, CatalystTag, EmptyState, Lozenge, Modal, ModalBody, ModalFooter,
  ModalHeader, ModalTitle, ProgressBar, SectionMessage, Tooltip,
} from '@/components/ads';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { executionApi } from '../domain';
import {
  useBenefits, useDependencies, useExecutionLinks, useInitiativeProjects,
  useInitiatives, useInvalidateStrata, useKpis, useMilestones, useProfileNames,
  useProjectCards, useStrataContext, useStrataRoles, useStrategyElements,
} from '../hooks/useStrata';
import type { StrataDependency, StrataMilestone, StrataProjectCard, StrataRole } from '../types';
import { fmtDate, fmtSarCompact, labelize } from './format';
import { StrataFormModal } from './authoring';
import type { StrataFormValues } from './authoring';
import { T } from './shared';

const WRITE_ROLES: StrataRole[] = ['strategy_office', 'vmo_validator', 'data_steward', 'strata_admin'];
const ARCHIVE_ROLES: StrataRole[] = ['strategy_office', 'vmo_validator', 'strata_admin'];

const MILESTONE_STATUS: Record<StrataMilestone['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  done: 'success', in_progress: 'inprogress', planned: 'default', missed: 'removed', descoped: 'default',
};
const DEPENDENCY_STATUS: Record<StrataDependency['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  open: 'default', at_risk: 'moved', blocked: 'removed', resolved: 'success', cancelled: 'default',
};
const DEPENDENCY_STATUS_OPTIONS = ['open', 'at_risk', 'blocked', 'resolved', 'cancelled'];
const DEPENDENCY_TYPE_OPTIONS = ['delivery', 'data', 'decision', 'resource', 'external'];
const MILESTONE_STATUS_OPTIONS = ['planned', 'in_progress', 'done', 'missed', 'descoped'];
const HEALTH_OPTIONS = ['on_track', 'at_risk', 'off_track'];

/** Form-value coercion: empty/blank → undefined so RPC COALESCE keeps existing. */
const fvStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
const fvNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/** Clear-flag detection: the modal opened with a value and the user cleared the field. */
const wasCleared = (initial: string | null | undefined, submitted: unknown): boolean =>
  initial != null && (submitted == null || (typeof submitted === 'string' && submitted.trim() === ''));

/** Normalize a DB-calculated progress value (fraction or percent) to 0..1. */
const asFraction = (v: number | null | undefined): number | null =>
  v == null ? null : Math.max(0, Math.min(1, v > 1 ? v / 100 : v));

const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };
const Dash = () => <span style={{ color: T.subtlest }}>—</span>;

/** Generic execution-link rows arrive untyped from the domain layer. */
interface ExecutionLinkRow {
  id: string;
  from_type: string;
  from_id: string;
  to_type: string;
  to_id: string;
  relationship_type: string;
  confidence: number | null;
}

function SummaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  );
}

function TabSection({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
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
  primary: React.ReactNode;
  meta?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  canAct: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
      border: `1px solid ${T.border}`, borderRadius: 6, background: T.raised,
    }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, overflowWrap: 'anywhere' }}>
        {primary}
      </span>
      {meta ? <span style={captionStyle}>{meta}</span> : null}
      {canAct && onAction ? (
        <Button appearance="subtle" spacing="compact" onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}

type FormKey =
  | 'edit' | 'archive'
  | 'new-milestone' | 'edit-milestone'
  | 'new-dependency' | 'edit-dependency'
  | 'add-link' | 'link-initiative'
  | null;

// ── Modal ────────────────────────────────────────────────────────────────────
export function ProjectDetailModal({ card, onClose }: {
  card: StrataProjectCard;
  onClose: () => void;
}) {
  const invalidate = useInvalidateStrata();
  const roles = useStrataRoles().data ?? [];
  const canWrite = roles.some((r) => WRITE_ROLES.includes(r));
  const canArchive = roles.some((r) => ARCHIVE_ROLES.includes(r));
  const { activeCycle } = useStrataContext();

  const milestonesQ = useMilestones(card.id);
  const dependenciesQ = useDependencies();
  const executionLinksQ = useExecutionLinks();
  const initiativeProjectsQ = useInitiativeProjects();
  const initiativesQ = useInitiatives();
  const projectCardsQ = useProjectCards();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const kpisQ = useKpis();
  const benefitsQ = useBenefits();
  const profilesQ = useProfileNames();

  const [form, setForm] = useState<FormKey>(null);
  const [editMilestone, setEditMilestone] = useState<StrataMilestone | null>(null);
  const [editDependency, setEditDependency] = useState<StrataDependency | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const milestones = milestonesQ.data ?? [];
  const initiatives = initiativesQ.data ?? [];
  const projectCards = projectCardsQ.data ?? [];
  const elements = elementsQ.data ?? [];
  const kpis = kpisQ.data ?? [];
  const benefits = benefitsQ.data ?? [];

  const projectDependencies = (dependenciesQ.data ?? []).filter(
    (d) => (d.requesting_type === 'project_card' && d.requesting_id === card.id)
      || (d.serving_type === 'project_card' && d.serving_id === card.id),
  );
  const projectLinks = ((executionLinksQ.data ?? []) as ExecutionLinkRow[]).filter(
    (l) => (l.from_type === 'project_card' && l.from_id === card.id)
      || (l.to_type === 'project_card' && l.to_id === card.id),
  );
  const linkedInitiatives = (initiativeProjectsQ.data ?? []).filter((r) => r.project_card_id === card.id);

  const initiativeName = (id: string) => initiatives.find((i) => i.id === id)?.name ?? null;
  const profileName = (id: string | null) => (id ? profilesQ.data?.get(id)?.name ?? null : null);

  /** Resolve any execution-link endpoint to a display name (zero-assumption). */
  const entityName = (type: string, id: string): string | null => {
    if (type === 'element' || type === 'objective') return elements.find((e) => e.id === id)?.name ?? null;
    if (type === 'kpi') return kpis.find((k) => k.id === id)?.name ?? null;
    if (type === 'benefit') return benefits.find((b) => b.id === id)?.name ?? null;
    if (type === 'initiative') return initiativeName(id);
    if (type === 'project_card') return projectCards.find((p) => p.id === id)?.name ?? null;
    return null;
  };

  const doAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      invalidate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  };

  const submitAndRefresh = (fn: (v: StrataFormValues) => Promise<unknown>) =>
    async (v: StrataFormValues) => { await fn(v); invalidate(); };

  const derivedProgress = asFraction(card.actual_progress);

  // ── Milestone table ─────────────────────────────────────────────────────────
  const milestoneColumns = useMemo<Column<StrataMilestone>[]>(() => [
    {
      id: 'name', label: 'Milestone', flex: true,
      cell: ({ row }) => (
        <span style={{ fontWeight: 600, color: T.text, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)' }}>
          {row.name}
        </span>
      ),
    },
    {
      id: 'due', label: 'Due', width: 11,
      cell: ({ row }) => (row.baseline_end ? <span style={{ color: T.subtle }}>{fmtDate(row.baseline_end)}</span> : <Dash />),
    },
    {
      id: 'forecast_actual', label: 'Forecast / actual', width: 20,
      cell: ({ row }) => (
        <span style={{ color: T.subtle }}>Forecast {fmtDate(row.forecast_date)} · Actual {fmtDate(row.actual_date)}</span>
      ),
    },
    {
      id: 'progress', label: 'Progress', width: 12,
      cell: ({ row }) => {
        const frac = asFraction(row.progress);
        return frac == null ? <Dash /> : <ProgressBar value={frac} aria-label={`Milestone progress ${Math.round(frac * 100)}%`} />;
      },
    },
    {
      id: 'weight', label: 'Weight', width: 8, align: 'end',
      cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums', color: T.subtle }}>{row.weight}</span>,
    },
    {
      id: 'status', label: 'Status', width: 11,
      cell: ({ row }) => <StatusLozenge status={row.status} appearance={MILESTONE_STATUS[row.status] ?? 'default'} />,
    },
    ...(canWrite ? [{
      id: 'actions', label: '', width: 8, align: 'end',
      cell: ({ row }) => (
        <Button appearance="subtle" spacing="compact" onClick={() => { setEditMilestone(row); setForm('edit-milestone'); }}>
          Edit
        </Button>
      ),
    } as Column<StrataMilestone>] : []),
  ], [canWrite]);

  // ── Dependency table (scoped to this project) ───────────────────────────────
  const dependencyColumns = useMemo<Column<StrataDependency>[]>(() => [
    {
      id: 'direction', label: 'Direction', width: 10,
      cell: ({ row }) => (
        <CatalystTag text={row.requesting_type === 'project_card' && row.requesting_id === card.id ? 'Requesting' : 'Serving'} />
      ),
    },
    {
      id: 'counterpart', label: 'Counterpart', flex: true,
      cell: ({ row }) => {
        const isRequesting = row.requesting_type === 'project_card' && row.requesting_id === card.id;
        const type = isRequesting ? row.serving_type : row.requesting_type;
        const id = isRequesting ? row.serving_id : row.requesting_id;
        const name = (id ? entityName(type, id) : null) ?? (isRequesting ? row.serving_label : null);
        return name
          ? <span style={{ fontWeight: 600, color: T.text, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)' }}>{name}</span>
          : <Dash />;
      },
    },
    {
      id: 'dependency_type', label: 'Type', width: 10,
      cell: ({ row }) => (row.dependency_type ? <CatalystTag text={labelize(row.dependency_type)} /> : <Dash />),
    },
    {
      id: 'due_date', label: 'Due', width: 10,
      cell: ({ row }) => (row.due_date ? <span style={{ color: T.subtle }}>{fmtDate(row.due_date)}</span> : <Dash />),
    },
    {
      id: 'status', label: 'Status', width: 10,
      cell: ({ row }) => <StatusLozenge status={row.status} appearance={DEPENDENCY_STATUS[row.status] ?? 'default'} />,
    },
    {
      id: 'is_blocker', label: 'Blocker', width: 8,
      cell: ({ row }) => (row.is_blocker ? <Lozenge appearance="removed" isBold>Blocker</Lozenge> : null),
    },
    {
      id: 'impact', label: 'Impact', width: 16,
      cell: ({ row }) => (row.impact
        ? (
          <Tooltip content={row.impact}>
            <span style={{ display: 'block', color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.impact}
            </span>
          </Tooltip>
        )
        : <Dash />),
    },
    ...(canWrite ? [{
      id: 'actions', label: '', width: 8, align: 'end',
      cell: ({ row }) => (
        <Button appearance="subtle" spacing="compact" onClick={() => { setEditDependency(row); setForm('edit-dependency'); }}>
          Edit
        </Button>
      ),
    } as Column<StrataDependency>] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canWrite, card.id, initiatives, projectCards, elements, kpis, benefits]);

  return (
    <>
      <Modal isOpen onClose={onClose} width="x-large" testId="strata-project-detail-modal">
        <ModalHeader>
          <ModalTitle>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              {card.name}
              <CatalystTag text={`${labelize(card.source_system)}${card.source_key ? ` · ${card.source_key}` : ''}`} />
            </span>
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {actionError ? (
            <div style={{ marginBottom: 12 }}>
              <SectionMessage appearance="error" title="Action rejected">
                <p style={{ whiteSpace: 'pre-wrap' }}>{actionError}</p>
              </SectionMessage>
            </div>
          ) : null}
          <Tabs id={`strata-project-detail-tabs-${card.id}`}>
            <TabList>
              <Tab>Summary</Tab>
              <Tab>Milestones</Tab>
              <Tab>Dependencies</Tab>
              <Tab>Links</Tab>
              <Tab>Initiatives</Tab>
            </TabList>

            {/* Summary */}
            <TabPanel>
              <div style={{ width: '100%', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {canWrite ? <Button spacing="compact" onClick={() => setForm('edit')}>Edit</Button> : null}
                  {canArchive ? (
                    <Button spacing="compact" appearance="subtle" onClick={() => setForm('archive')}>Archive</Button>
                  ) : null}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                  <SummaryField label="Stage">{card.stage ? labelize(card.stage) : <Dash />}</SummaryField>
                  <SummaryField label="Execution health">
                    {card.execution_health ? labelize(card.execution_health) : <Dash />}
                  </SummaryField>
                  <SummaryField label="Project manager">{profileName(card.pm_id) ?? <Dash />}</SummaryField>
                  <SummaryField label="Sector">{card.sector ?? <Dash />}</SummaryField>
                  <SummaryField label="Budget">{card.budget != null ? fmtSarCompact(card.budget) : <Dash />}</SummaryField>
                  <SummaryField label="Source">
                    {labelize(card.source_system)}{card.source_key ? ` · ${card.source_key}` : ''}
                  </SummaryField>
                  <SummaryField label="Baseline start">{card.baseline_start ? fmtDate(card.baseline_start) : <Dash />}</SummaryField>
                  <SummaryField label="Baseline end">{card.baseline_end ? fmtDate(card.baseline_end) : <Dash />}</SummaryField>
                  <SummaryField label="Forecast end">{card.forecast_end ? fmtDate(card.forecast_end) : <Dash />}</SummaryField>
                </div>
                <SummaryField label="Derived progress (calculated)">
                  {derivedProgress == null ? <Dash /> : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, maxWidth: 320 }}>
                        <ProgressBar value={derivedProgress} aria-label={`Execution progress ${Math.round(derivedProgress * 100)}%`} />
                      </span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{Math.round(derivedProgress * 100)}%</span>
                    </span>
                  )}
                  <span style={{ ...captionStyle, display: 'block', marginTop: 4 }}>
                    Milestone-weighted, server-calculated — not editable here.
                  </span>
                </SummaryField>
                <SummaryField label="Risk summary">{card.risk_summary ?? <Dash />}</SummaryField>
                <SummaryField label="Dependency summary">{card.dependency_summary ?? <Dash />}</SummaryField>
              </div>
            </TabPanel>

            {/* Milestones */}
            <TabPanel>
              <TabSection
                title={`Milestones (${milestones.length})`}
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('new-milestone')}>New milestone</Button> : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...captionStyle, fontWeight: 600 }}>Project progress</span>
                  {derivedProgress == null ? <Dash /> : (
                    <>
                      <span style={{ flex: '0 1 240px', minWidth: 120 }}>
                        <ProgressBar value={derivedProgress} aria-label={`Execution progress ${Math.round(derivedProgress * 100)}%`} />
                      </span>
                      <span style={{ ...captionStyle, fontWeight: 600, color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(derivedProgress * 100)}%
                      </span>
                    </>
                  )}
                  <span style={captionStyle}>· recalculated by the server on every milestone write</span>
                </div>
                {milestones.length === 0 ? (
                  <EmptyState size="compact" header="No milestones" description="Milestones drive the server-calculated project progress." />
                ) : (
                  <JiraTable<StrataMilestone>
                    columns={milestoneColumns}
                    data={milestones}
                    getRowId={(row) => row.id}
                    density="compact"
                    showRowCount={false}
                    rowsPerPage={100}
                    ariaLabel="Milestones"
                  />
                )}
              </TabSection>
            </TabPanel>

            {/* Dependencies */}
            <TabPanel>
              <TabSection
                title={`Dependencies (${projectDependencies.length})`}
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('new-dependency')}>New dependency</Button> : undefined}
              >
                {projectDependencies.length === 0 ? (
                  <EmptyState size="compact" header="No dependencies" description="Dependencies where this project is requesting or serving appear here." />
                ) : (
                  <JiraTable<StrataDependency>
                    columns={dependencyColumns}
                    data={projectDependencies}
                    getRowId={(row) => row.id}
                    density="compact"
                    showRowCount={false}
                    rowsPerPage={100}
                    ariaLabel="Project dependencies"
                  />
                )}
              </TabSection>
            </TabPanel>

            {/* Links */}
            <TabPanel>
              <TabSection
                title={`Execution links (${projectLinks.length})`}
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('add-link')}>Add link</Button> : undefined}
              >
                {projectLinks.length === 0 ? (
                  <EmptyState size="compact" header="No execution links" description="Trace this project to objectives, KPIs and benefits." />
                ) : projectLinks.map((link) => {
                  const outbound = link.from_type === 'project_card' && link.from_id === card.id;
                  const otherType = outbound ? link.to_type : link.from_type;
                  const otherId = outbound ? link.to_id : link.from_id;
                  return (
                    <LinkedRow
                      key={link.id}
                      primary={(
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <CatalystTag text={labelize(otherType)} />
                          {entityName(otherType, otherId) ?? <Dash />}
                        </span>
                      )}
                      meta={`${labelize(link.relationship_type)}${link.confidence != null ? ` · confidence ${(link.confidence * 100).toFixed(0)}%` : ''}`}
                      actionLabel="Remove"
                      canAct={canWrite}
                      onAction={() => doAction(() => executionApi.unlinkExecution(link.id))}
                    />
                  );
                })}
              </TabSection>
            </TabPanel>

            {/* Initiatives */}
            <TabPanel>
              <TabSection
                title={`Linked initiatives (${linkedInitiatives.length})`}
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('link-initiative')}>Link initiative</Button> : undefined}
              >
                {linkedInitiatives.length === 0 ? (
                  <EmptyState size="compact" header="No initiatives mapped" description="Map this project card to the initiatives it delivers." />
                ) : linkedInitiatives.map((row) => (
                  <LinkedRow
                    key={row.id}
                    primary={initiativeName(row.initiative_id) ?? <Dash />}
                    meta={row.mapping_confidence != null ? `Confidence ${row.mapping_confidence <= 1 ? (row.mapping_confidence * 100).toFixed(0) : row.mapping_confidence.toFixed(0)}%` : undefined}
                    canAct={canWrite}
                    onAction={() => doAction(() => executionApi.unlinkInitiativeProject(row.initiative_id, card.id))}
                  />
                ))}
              </TabSection>
            </TabPanel>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* ── Authoring modals (stacked above the detail modal) ── */}
      <StrataFormModal
        open={form === 'edit'}
        onClose={() => setForm(null)}
        title="Edit project card"
        submitLabel="Save"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          { key: 'pmId', label: 'Project manager', kind: 'user' },
          { key: 'sector', label: 'Sector', kind: 'text' },
          { key: 'budget', label: 'Budget (SAR)', kind: 'number', min: 0 },
          { key: 'baselineStart', label: 'Baseline start', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline end', kind: 'date' },
          { key: 'forecastEnd', label: 'Forecast end', kind: 'date' },
          { key: 'stage', label: 'Stage', kind: 'text', helper: 'Governed stage taxonomy — free text' },
          {
            key: 'executionHealth', label: 'Execution health', kind: 'select',
            options: HEALTH_OPTIONS.map((h) => ({ value: h, label: labelize(h) })),
            helper: 'Leave empty when unknown',
          },
          { key: 'riskSummary', label: 'Risk summary', kind: 'textarea' },
          { key: 'dependencySummary', label: 'Dependency summary', kind: 'textarea' },
        ]}
        initial={{
          name: card.name, pmId: card.pm_id, sector: card.sector, budget: card.budget,
          baselineStart: card.baseline_start, baselineEnd: card.baseline_end,
          forecastEnd: card.forecast_end, stage: card.stage, executionHealth: card.execution_health,
          riskSummary: card.risk_summary, dependencySummary: card.dependency_summary,
        }}
        onSubmit={submitAndRefresh((v) => executionApi.updateProjectCard(card.id, {
          name: fvStr(v.name), pmId: fvStr(v.pmId), sector: fvStr(v.sector), budget: fvNum(v.budget),
          baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd),
          forecastEnd: fvStr(v.forecastEnd), stage: fvStr(v.stage),
          executionHealth: fvStr(v.executionHealth),
          riskSummary: fvStr(v.riskSummary), dependencySummary: fvStr(v.dependencySummary),
          // Clear affordances: the field opened with a value and the user emptied it.
          clearPm: wasCleared(card.pm_id, v.pmId),
          clearExecutionHealth: wasCleared(card.execution_health, v.executionHealth),
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
        open={form === 'new-milestone'}
        onClose={() => setForm(null)}
        title="New milestone"
        description="Milestone writes recalculate the project's milestone-weighted progress on the server."
        submitLabel="Create"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'baselineStart', label: 'Baseline start', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline end', kind: 'date' },
          { key: 'forecastDate', label: 'Forecast date', kind: 'date' },
          { key: 'actualDate', label: 'Actual date', kind: 'date' },
          {
            key: 'status', label: 'Status', kind: 'select',
            options: MILESTONE_STATUS_OPTIONS.map((s) => ({ value: s, label: labelize(s) })),
          },
          { key: 'progress', label: 'Progress (%)', kind: 'number', min: 0, max: 100 },
          { key: 'weight', label: 'Weight', kind: 'number', min: 0 },
        ]}
        initial={{ status: 'planned' }}
        onSubmit={submitAndRefresh((v) => executionApi.createMilestone({
          projectId: card.id, name: String(v.name ?? '').trim(), ownerId: fvStr(v.ownerId),
          baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd),
          forecastDate: fvStr(v.forecastDate), actualDate: fvStr(v.actualDate),
          status: fvStr(v.status), progress: fvNum(v.progress), weight: fvNum(v.weight),
        }))}
        testId="strata-milestone-create-modal"
      />

      <StrataFormModal
        open={form === 'edit-milestone' && editMilestone != null}
        onClose={() => { setForm(null); setEditMilestone(null); }}
        title="Edit milestone"
        description="Progress, status and weight feed the server-side project progress recalc."
        submitLabel="Save"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'baselineStart', label: 'Baseline start', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline end', kind: 'date' },
          { key: 'forecastDate', label: 'Forecast date', kind: 'date' },
          { key: 'actualDate', label: 'Actual date', kind: 'date' },
          {
            key: 'status', label: 'Status', kind: 'select',
            options: MILESTONE_STATUS_OPTIONS.map((s) => ({ value: s, label: labelize(s) })),
          },
          { key: 'progress', label: 'Progress (%)', kind: 'number', min: 0, max: 100 },
          { key: 'weight', label: 'Weight', kind: 'number', min: 0 },
        ]}
        initial={editMilestone ? {
          name: editMilestone.name, ownerId: editMilestone.owner_id,
          baselineStart: editMilestone.baseline_start, baselineEnd: editMilestone.baseline_end,
          forecastDate: editMilestone.forecast_date, actualDate: editMilestone.actual_date,
          status: editMilestone.status, progress: editMilestone.progress, weight: editMilestone.weight,
        } : undefined}
        onSubmit={submitAndRefresh((v) => executionApi.updateMilestone(editMilestone!.id, {
          name: fvStr(v.name), ownerId: fvStr(v.ownerId),
          baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd),
          forecastDate: fvStr(v.forecastDate), actualDate: fvStr(v.actualDate),
          status: fvStr(v.status), progress: fvNum(v.progress), weight: fvNum(v.weight),
        }))}
        testId="strata-milestone-edit-modal"
      />

      <StrataFormModal
        open={form === 'new-dependency'}
        onClose={() => setForm(null)}
        title="New dependency"
        description={`Requesting party: this project card ("${card.name}").`}
        submitLabel="Create"
        fields={[
          {
            key: 'servingType', label: 'Serving type', kind: 'select', required: true,
            options: [
              { value: 'initiative', label: 'Initiative' },
              { value: 'project_card', label: 'Project card' },
              { value: 'external', label: 'External' },
            ],
          },
          {
            key: 'servingInitiativeId', label: 'Serving initiative', kind: 'select',
            helper: 'Used when serving type is Initiative',
            options: initiatives.map((i) => ({ value: i.id, label: i.name })),
          },
          {
            key: 'servingProjectId', label: 'Serving project card', kind: 'select',
            helper: 'Used when serving type is Project card',
            options: projectCards.filter((p) => p.id !== card.id).map((p) => ({ value: p.id, label: p.name })),
          },
          { key: 'servingLabel', label: 'Serving label', kind: 'text', helper: 'Used when serving type is External' },
          {
            key: 'dependencyType', label: 'Dependency type', kind: 'select', required: true,
            options: DEPENDENCY_TYPE_OPTIONS.map((t) => ({ value: t, label: labelize(t) })),
          },
          { key: 'dueDate', label: 'Due date', kind: 'date' },
          { key: 'slaDays', label: 'SLA (days)', kind: 'number', min: 0, step: 1 },
          { key: 'impact', label: 'Impact', kind: 'textarea' },
          { key: 'isBlocker', label: 'Blocker', kind: 'checkbox', placeholder: 'This dependency blocks delivery' },
        ]}
        initial={{ servingType: 'initiative', dependencyType: 'delivery' }}
        onSubmit={submitAndRefresh(async (v) => {
          const servingType = String(v.servingType) as 'initiative' | 'project_card' | 'external';
          const servingId = servingType === 'initiative' ? fvStr(v.servingInitiativeId)
            : servingType === 'project_card' ? fvStr(v.servingProjectId) : undefined;
          if (servingType !== 'external' && !servingId) {
            throw new Error(`Pick the serving ${servingType === 'initiative' ? 'initiative' : 'project card'}.`);
          }
          if (servingType === 'external' && !fvStr(v.servingLabel)) {
            throw new Error('External dependencies need a serving label.');
          }
          return executionApi.createDependency({
            requestingType: 'project_card', requestingId: card.id,
            servingType, servingId, servingLabel: fvStr(v.servingLabel),
            dependencyType: fvStr(v.dependencyType), dueDate: fvStr(v.dueDate),
            slaDays: fvNum(v.slaDays), impact: fvStr(v.impact), isBlocker: Boolean(v.isBlocker),
          });
        })}
        testId="strata-project-dependency-create-modal"
      />

      <StrataFormModal
        open={form === 'edit-dependency' && editDependency != null}
        onClose={() => { setForm(null); setEditDependency(null); }}
        title="Edit dependency"
        submitLabel="Save"
        fields={[
          {
            key: 'status', label: 'Status', kind: 'select', required: true,
            options: DEPENDENCY_STATUS_OPTIONS.map((s) => ({ value: s, label: labelize(s) })),
          },
          { key: 'dueDate', label: 'Due date', kind: 'date' },
          { key: 'slaDays', label: 'SLA (days)', kind: 'number', min: 0, step: 1 },
          { key: 'impact', label: 'Impact', kind: 'textarea' },
          { key: 'isBlocker', label: 'Blocker', kind: 'checkbox', placeholder: 'This dependency blocks delivery' },
          { key: 'servingLabel', label: 'Serving label', kind: 'text', helper: 'External dependencies only' },
        ]}
        initial={editDependency ? {
          status: editDependency.status, dueDate: editDependency.due_date,
          slaDays: editDependency.sla_days, impact: editDependency.impact,
          isBlocker: editDependency.is_blocker, servingLabel: editDependency.serving_label,
        } : undefined}
        onSubmit={submitAndRefresh((v) => executionApi.updateDependency(editDependency!.id, {
          status: fvStr(v.status), dueDate: fvStr(v.dueDate), slaDays: fvNum(v.slaDays),
          impact: fvStr(v.impact), isBlocker: Boolean(v.isBlocker), servingLabel: fvStr(v.servingLabel),
        }))}
        testId="strata-project-dependency-edit-modal"
      />

      <StrataFormModal
        open={form === 'add-link'}
        onClose={() => setForm(null)}
        title="Add execution link"
        description="Trace this project card to an objective, KPI or benefit."
        submitLabel="Link"
        fields={[
          {
            key: 'toType', label: 'Link to', kind: 'select', required: true,
            options: [
              { value: 'objective', label: 'Objective (strategy element)' },
              { value: 'kpi', label: 'KPI' },
              { value: 'benefit', label: 'Benefit' },
            ],
          },
          {
            key: 'objectiveId', label: 'Objective', kind: 'select',
            helper: 'Used when linking to an objective',
            options: elements.map((e) => ({ value: e.id, label: e.name })),
          },
          {
            key: 'kpiId', label: 'KPI', kind: 'select',
            helper: 'Used when linking to a KPI',
            options: kpis.map((k) => ({ value: k.id, label: k.name })),
          },
          {
            key: 'benefitId', label: 'Benefit', kind: 'select',
            helper: 'Used when linking to a benefit',
            options: benefits.map((b) => ({ value: b.id, label: b.name })),
          },
          { key: 'confidence', label: 'Confidence (0–1)', kind: 'number', min: 0, max: 1, step: 0.05 },
        ]}
        initial={{ toType: 'objective' }}
        onSubmit={submitAndRefresh(async (v) => {
          const toType = String(v.toType);
          const toId = toType === 'objective' ? fvStr(v.objectiveId)
            : toType === 'kpi' ? fvStr(v.kpiId) : fvStr(v.benefitId);
          if (!toId) throw new Error(`Pick the ${toType === 'objective' ? 'objective' : toType} to link to.`);
          return executionApi.linkExecution({
            fromType: 'project_card', fromId: card.id, toType, toId, confidence: fvNum(v.confidence),
          });
        })}
        testId="strata-project-add-link-modal"
      />

      <StrataFormModal
        open={form === 'link-initiative'}
        onClose={() => setForm(null)}
        title="Link initiative"
        submitLabel="Link"
        fields={[
          {
            key: 'initiativeId', label: 'Initiative', kind: 'select', required: true,
            options: initiatives
              .filter((i) => !linkedInitiatives.some((r) => r.initiative_id === i.id))
              .map((i) => ({ value: i.id, label: i.name })),
          },
          { key: 'confidence', label: 'Mapping confidence (0–1)', kind: 'number', min: 0, max: 1, step: 0.05 },
        ]}
        onSubmit={submitAndRefresh((v) => executionApi.linkInitiativeProject(String(v.initiativeId), card.id, fvNum(v.confidence)))}
        testId="strata-project-link-initiative-modal"
      />
    </>
  );
}
