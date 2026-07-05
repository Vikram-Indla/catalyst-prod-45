/**
 * STRATA Execution page — Initiative ↔ Project Card linkage (CAT-STRATA-20260705-001).
 * Routes: /strata/execution and /strata/execution/:slug.
 *
 * Master-detail: initiatives rail (left) → detail column (initiative hero,
 * strategy linkage, project cards — the source-agnostic showcase) →
 * dependencies (full width, canonical JiraTable).
 * UI renders server-calculated values only: actual_progress / execution_health
 * come from the DB calc engine. Zero-assumption: '—' for unknowns.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar, Button, CatalystTag, EmptyState, Heading, Lozenge, ProgressBar,
  SectionMessage, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { GitBranch, Rocket, TrendingDown, TrendingUp } from '@/lib/atlaskit-icons';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import {
  StrataBandLozenge, StrataPageShell, StrataPanel, StrataStatStrip, T,
} from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import type { StrataFormValues } from '@/modules/strata/components/authoring';
import { InitiativeDetailModal } from '@/modules/strata/components/InitiativeDetailModal';
import { ProjectDetailModal } from '@/modules/strata/components/ProjectDetailModal';
import { executionApi } from '@/modules/strata/domain';
import { fmtDate, fmtPct, fmtRatioPct, fmtSarCompact, labelize } from '@/modules/strata/components/format';
import {
  useDependencies, useInitiativeElements, useInitiativeKpis, useInitiativeProjects,
  useInitiatives, useInvalidateStrata, useKpis, useMilestones, useProfileNames,
  useProjectCards, useStrataContext, useStrataRoles, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import type {
  StrataDependency, StrataInitiative, StrataInitiativeProject, StrataKpi,
  StrataMilestone, StrataProjectCard, StrataRole, StrataStrategyElement,
} from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

// ── System-state lozenge maps (mirror DB CHECK constraints) ──────────────────
const INITIATIVE_STATUS: Record<StrataInitiative['status'], LozengeAppearance> = {
  active: 'inprogress', on_hold: 'moved', completed: 'success', stopped: 'removed', draft: 'default',
};
const MILESTONE_STATUS: Record<StrataMilestone['status'], 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new'> = {
  done: 'success', in_progress: 'inprogress', planned: 'default', missed: 'removed', descoped: 'default',
};
const DEPENDENCY_STATUS: Record<StrataDependency['status'], 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new'> = {
  open: 'default', at_risk: 'moved', blocked: 'removed', resolved: 'success', cancelled: 'default',
};
const SOURCE_LABEL: Record<StrataProjectCard['source_system'], string> = {
  jira: 'Jira', manual: 'Manual', upload: 'Upload', api: 'API',
};

// Create/edit affordances (DB enforces the real rules — this is UI gating only).
const WRITE_ROLES: StrataRole[] = ['strategy_office', 'vmo_validator', 'data_steward', 'strata_admin'];

/** Form-value coercion: empty/blank → undefined so optional RPC args stay null. */
const fvStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
const fvNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const DEPENDENCY_TYPE_OPTIONS = ['delivery', 'data', 'decision', 'resource', 'external'];

const Dash = () => <span style={{ color: T.subtlest }}>—</span>;

/** Normalize a DB-calculated progress value (fraction or percent) to 0..1 for display. */
const asFraction = (v: number | null | undefined): number | null =>
  v == null ? null : Math.max(0, Math.min(1, v > 1 ? v / 100 : v));

/** Confidence values arrive as ratio (0–1) or percent — normalize for display (S-159). */
const fmtConfidence = (v: number | null | undefined): string | null => {
  if (v == null) return null;
  return v <= 1 ? fmtRatioPct(v) : fmtPct(v);
};

function relTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const isPast = (d: string | null | undefined): boolean =>
  !!d && new Date(d).getTime() < Date.now();

const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };

function useIsNarrow(breakpoint = 1024): boolean {
  const [narrow, setNarrow] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return narrow;
}

// Junction rows arrive untyped from the domain layer.
interface InitiativeElementRow {
  initiative_id: string;
  element_id: string;
  contribution_weight?: number | null;
  weight?: number | null;
}
interface InitiativeKpiRow { initiative_id: string; kpi_id: string }

// ── Initiatives rail card ────────────────────────────────────────────────────
function InitiativeRailCard({ initiative, selected, onSelect }: {
  initiative: StrataInitiative;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={`strata-initiative-card-${initiative.slug ?? initiative.id}`}
      style={{
        background: selected ? T.selected : hover ? T.sunken : T.raised,
        border: `1px solid ${selected ? 'var(--ds-border-focused)' : T.border}`,
        borderLeft: `2px solid ${selected ? T.brandText : 'transparent'}`,
        borderRadius: 8, padding: 12, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, minWidth: 0, overflowWrap: 'anywhere' }}>
          {initiative.name}
        </strong>
        <Lozenge appearance={INITIATIVE_STATUS[initiative.status] ?? 'default'}>
          {labelize(initiative.status)}
        </Lozenge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={captionStyle}>Stage · <span style={{ color: T.subtle, fontWeight: 600 }}>{labelize(initiative.stage)}</span></span>
        {initiative.budget_envelope != null ? (
          <span style={captionStyle}>Budget · <span style={{ color: T.subtle, fontWeight: 600 }}>{fmtSarCompact(initiative.budget_envelope)}</span></span>
        ) : null}
      </div>
      {initiative.value_hypothesis ? (
        <p
          style={{
            margin: 0, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}
        >
          {initiative.value_hypothesis}
        </p>
      ) : null}
    </div>
  );
}

// ── Milestones subtable (canonical JiraTable, S-152) ─────────────────────────
const milestoneOverdue = (m: StrataMilestone): boolean =>
  isPast(m.baseline_end) && m.status !== 'done' && m.status !== 'descoped';

function MilestonesSubtable({ projectCardId }: { projectCardId: string }) {
  const milestonesQ = useMilestones(projectCardId);

  const columns = useMemo<Column<StrataMilestone>[]>(() => [
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
      cell: ({ row }) => (row.baseline_end
        ? (
          <span style={{ color: milestoneOverdue(row) ? 'var(--ds-text-danger)' : T.subtle, fontWeight: milestoneOverdue(row) ? 600 : 400 }}>
            {fmtDate(row.baseline_end)}
          </span>
        )
        : <Dash />),
    },
    {
      id: 'forecast_actual', label: 'Forecast / actual', width: 22,
      cell: ({ row }) => (
        <span style={{ color: T.subtle }}>
          Forecast {fmtDate(row.forecast_date)} · Actual {fmtDate(row.actual_date)}
        </span>
      ),
    },
    {
      id: 'progress', label: 'Progress', width: 12,
      cell: ({ row }) => {
        const frac = asFraction(row.progress);
        return frac == null
          ? <Dash />
          : <ProgressBar value={frac} aria-label={`Milestone progress ${Math.round(frac * 100)}%`} />;
      },
    },
    {
      id: 'weight', label: 'Weight', width: 8, align: 'end',
      cell: ({ row }) => (row.weight != null
        ? <span style={{ fontVariantNumeric: 'tabular-nums', color: T.subtle }}>{row.weight}</span>
        : <Dash />),
    },
    {
      id: 'status', label: 'Status', width: 12,
      cell: ({ row }) => <StatusLozenge status={row.status} appearance={MILESTONE_STATUS[row.status] ?? 'default'} />,
    },
  ], []);

  if (milestonesQ.isLoading) return <div style={{ padding: 8 }}><Spinner size="small" aria-label="Loading milestones" /></div>;
  if (milestonesQ.isError) {
    return <p style={{ ...captionStyle, color: 'var(--ds-text-danger)' }}>Failed to load milestones.</p>;
  }
  const milestones = milestonesQ.data ?? [];
  if (milestones.length === 0) {
    return <p style={captionStyle}>No milestones recorded for this project card.</p>;
  }
  return (
    <div style={{ marginTop: 8 }} data-testid={`strata-milestones-${projectCardId}`}>
      <JiraTable<StrataMilestone>
        columns={columns}
        data={milestones}
        getRowId={(row) => row.id}
        density="compact"
        showRowCount={false}
        rowsPerPage={100}
        ariaLabel="Milestones"
      />
    </div>
  );
}

// ── Project card (source-agnostic showcase) ──────────────────────────────────
function ProjectCardItem({ card, mappingConfidence, onOpenDetail }: {
  card: StrataProjectCard;
  mappingConfidence: number | null;
  onOpenDetail: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Fetched eagerly so the toggle can show the milestone count (S-161);
  // the subtable shares the same query key, so no duplicate request.
  const milestonesQ = useMilestones(card.id);
  const milestoneCount = milestonesQ.data?.length ?? null;
  const frac = asFraction(card.actual_progress);
  const connectorFed = card.source_system === 'jira' || card.source_system === 'api';
  const synced = connectorFed ? relTime(card.last_synced_at) : null;
  const confidenceText = fmtConfidence(mappingConfidence);
  const forecastDelta =
    card.baseline_end && card.forecast_end
      ? Math.round((new Date(card.forecast_end).getTime() - new Date(card.baseline_end).getTime()) / 86_400_000)
      : null;
  return (
    <div
      data-testid={`strata-project-card-${card.slug ?? card.id}`}
      style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: T.raised }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, overflowWrap: 'anywhere' }}>{card.name}</strong>
          <CatalystTag
            text={`${SOURCE_LABEL[card.source_system] ?? labelize(card.source_system)}${card.source_key ? ` · ${card.source_key}` : ''}`}
          />
        </div>
        <StrataBandLozenge bandKey={card.execution_health} />
      </div>
      {confidenceText ? (
        <span style={captionStyle}>Mapping confidence {confidenceText}</span>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {frac == null ? (
          <span style={{ ...captionStyle, fontWeight: 600 }}>Progress —</span>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ProgressBar value={frac} aria-label={`Execution progress ${Math.round(frac * 100)}%`} />
            </div>
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {`${Math.round(frac * 100)}%`}
            </span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={captionStyle}>Baseline end {fmtDate(card.baseline_end)}</span>
        <span style={captionStyle}>Forecast end {fmtDate(card.forecast_end)}</span>
        {forecastDelta != null && forecastDelta !== 0 ? (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
              color: forecastDelta > 0 ? 'var(--ds-text-danger)' : 'var(--ds-text-success)',
            }}
          >
            {forecastDelta > 0
              ? <TrendingDown size={14} color="var(--ds-icon-danger)" />
              : <TrendingUp size={14} color="var(--ds-icon-success)" />}
            Forecast {forecastDelta > 0 ? '+' : ''}{forecastDelta} day{Math.abs(forecastDelta) === 1 ? '' : 's'}
          </span>
        ) : null}
        {synced ? <span style={captionStyle}>Synced {synced}</span> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button appearance="subtle" spacing="compact" onClick={() => setExpanded((v) => !v)}>
          {`${expanded ? 'Hide' : 'Show'} milestones${milestoneCount != null ? ` (${milestoneCount})` : ''}`}
        </Button>
        <Button
          appearance="subtle"
          spacing="compact"
          onClick={onOpenDetail}
          testId={`strata-project-detail-open-${card.slug ?? card.id}`}
        >
          Details
        </Button>
      </div>
      {expanded ? <MilestonesSubtable projectCardId={card.id} /> : null}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataExecutionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { activeCycle } = useStrataContext();
  const isNarrow = useIsNarrow();

  const initiativesQ = useInitiatives();
  const projectCardsQ = useProjectCards();
  const initiativeProjectsQ = useInitiativeProjects();
  const initiativeElementsQ = useInitiativeElements();
  const initiativeKpisQ = useInitiativeKpis();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const kpisQ = useKpis();
  const dependenciesQ = useDependencies();
  const profilesQ = useProfileNames();
  const [railFilter, setRailFilter] = useState('');

  // ── Authoring state (Lanes C+D) ────────────────────────────────────────────
  const invalidate = useInvalidateStrata();
  const roles = useStrataRoles().data ?? [];
  const canWrite = roles.some((r) => WRITE_ROLES.includes(r));
  const [pageForm, setPageForm] = useState<'new-initiative' | 'new-project' | 'new-dependency' | null>(null);
  const [detailInitiativeId, setDetailInitiativeId] = useState<string | null>(null);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);

  const initiatives = initiativesQ.data ?? [];
  const projectCards = projectCardsQ.data ?? [];
  const initiativeProjects = initiativeProjectsQ.data ?? [];
  const initiativeElements = (initiativeElementsQ.data ?? []) as InitiativeElementRow[];
  const initiativeKpis = (initiativeKpisQ.data ?? []) as InitiativeKpiRow[];
  const elements = elementsQ.data ?? [];
  const kpis = kpisQ.data ?? [];
  const dependencies = dependenciesQ.data ?? [];

  const selected: StrataInitiative | null =
    (slug ? initiatives.find((i) => i.slug === slug) : undefined) ?? initiatives[0] ?? null;

  const isLoading = initiativesQ.isLoading;
  const isError = initiativesQ.isError || projectCardsQ.isError;
  const errorMessage =
    (initiativesQ.error as Error | null)?.message ?? (projectCardsQ.error as Error | null)?.message ?? 'Unknown error';

  const elementById = new Map<string, StrataStrategyElement>(elements.map((e) => [e.id, e]));
  const kpiById = new Map<string, StrataKpi>(kpis.map((k) => [k.id, k]));
  const cardById = new Map<string, StrataProjectCard>(projectCards.map((c) => [c.id, c]));
  const initiativeById = new Map<string, StrataInitiative>(initiatives.map((i) => [i.id, i]));

  const railInitiatives = railFilter.trim()
    ? initiatives.filter((i) => i.name.toLowerCase().includes(railFilter.trim().toLowerCase()))
    : initiatives;

  const linkedElements = selected ? initiativeElements.filter((r) => r.initiative_id === selected.id) : [];
  const linkedKpis = selected ? initiativeKpis.filter((r) => r.initiative_id === selected.id) : [];
  const linkedProjects: StrataInitiativeProject[] = selected
    ? initiativeProjects.filter((r) => r.initiative_id === selected.id)
    : [];

  const ownerProfile = selected?.owner_id ? profilesQ.data?.get(selected.owner_id) : undefined;

  const resolvePartyName = (type: StrataDependency['requesting_type'] | StrataDependency['serving_type'], id: string | null): string | null => {
    if (!id) return null;
    if (type === 'initiative') return initiativeById.get(id)?.name ?? null;
    if (type === 'project_card') return cardById.get(id)?.name ?? null;
    return null;
  };

  const dependencyOverdue = (dep: StrataDependency): boolean =>
    isPast(dep.due_date) && (dep.status === 'open' || dep.status === 'at_risk' || dep.status === 'blocked');

  const dependencyColumns: Column<StrataDependency>[] = [
    {
      id: 'requesting', label: 'Requesting', width: 15,
      cell: ({ row }) => {
        const name = resolvePartyName(row.requesting_type, row.requesting_id);
        return name
          ? (
            <span style={{ fontWeight: 600, color: T.text, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)' }}>
              {name}
            </span>
          )
          : <Dash />;
      },
    },
    {
      id: 'serving', label: 'Serving', width: 15,
      cell: ({ row }) => {
        const name = resolvePartyName(row.serving_type, row.serving_id) ?? row.serving_label;
        return name ? <span style={{ color: T.text }}>{name}</span> : <Dash />;
      },
    },
    {
      id: 'dependency_type', label: 'Type', width: 10,
      cell: ({ row }) => (row.dependency_type ? <CatalystTag text={labelize(row.dependency_type)} /> : <Dash />),
    },
    {
      id: 'due_date', label: 'Due', width: 10,
      cell: ({ row }) => (row.due_date
        ? (
          <span style={{ color: dependencyOverdue(row) ? 'var(--ds-text-danger)' : T.subtle, fontWeight: dependencyOverdue(row) ? 600 : 400 }}>
            {fmtDate(row.due_date)}
          </span>
        )
        : <Dash />),
    },
    {
      id: 'status', label: 'Status', width: 10,
      cell: ({ row }) => <StatusLozenge status={row.status} appearance={DEPENDENCY_STATUS[row.status] ?? 'default'} />,
    },
    {
      id: 'sla_days', label: 'SLA', width: 8,
      cell: ({ row }) => (row.sla_days != null
        ? <span style={{ color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>{row.sla_days} day{row.sla_days === 1 ? '' : 's'}</span>
        : <Dash />),
    },
    {
      id: 'is_blocker', label: 'Blocker', width: 9,
      cell: ({ row }) => (row.is_blocker ? <Lozenge appearance="removed" isBold>Blocker</Lozenge> : null),
    },
    {
      id: 'impact', label: 'Impact', flex: true,
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
  ];

  // Detail sub-view only when the URL slug resolves to a real initiative —
  // fallback selection (initiatives[0]) is still the index view.
  const trailEntity = slug && selected && selected.slug === slug ? selected : null;

  // Detail-modal entities derived from live query data so RPC writes +
  // invalidation refresh the open modal (never a stale snapshot).
  const detailInitiative = detailInitiativeId ? initiativeById.get(detailInitiativeId) ?? null : null;
  const detailProject = detailProjectId ? cardById.get(detailProjectId) ?? null : null;

  const submitAndRefresh = (fn: (v: StrataFormValues) => Promise<unknown>) =>
    async (v: StrataFormValues) => { await fn(v); invalidate(); };

  return (
    <StrataPageShell
      trail={trailEntity ? [
        { text: 'Execution', href: Routes.strata.execution() },
        { text: trailEntity.name },
      ] : undefined}
      hideTitle={!!trailEntity}
      docTitle={trailEntity ? trailEntity.name : undefined}
      headerActions={canWrite ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button spacing="compact" onClick={() => setPageForm('new-initiative')} testId="strata-new-initiative">
            New initiative
          </Button>
          <Button spacing="compact" appearance="primary" onClick={() => setPageForm('new-project')} testId="strata-new-project-card">
            New project card
          </Button>
        </div>
      ) : undefined}
      testId="strata-execution-chrome"
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" aria-label="Loading execution data" />
        </div>
      ) : isError ? (
        <SectionMessage appearance="error" title="Could not load execution data">
          <p>{errorMessage}</p>
        </SectionMessage>
      ) : initiatives.length === 0 ? (
        <EmptyState
          header="No initiatives yet"
          description="Initiatives appear here once the strategy office promotes strategy elements into execution."
          testId="strata-execution-empty"
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', gap: 16, alignItems: 'flex-start' }}>
            {/* Initiatives rail */}
            <div
              data-testid="strata-initiatives-rail"
              style={{ flex: isNarrow ? '1 1 auto' : '0 0 340px', width: isNarrow ? '100%' : 340, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <Textfield
                spacing="compact"
                placeholder="Filter initiatives"
                value={railFilter}
                onChange={(e) => setRailFilter((e.target as HTMLInputElement).value)}
                aria-label="Filter initiatives by name"
              />
              {railInitiatives.length === 0 ? (
                <p style={{ ...captionStyle, margin: '8px 0 0' }}>No initiatives match the filter.</p>
              ) : railInitiatives.map((initiative) => (
                <InitiativeRailCard
                  key={initiative.id}
                  initiative={initiative}
                  selected={initiative.id === selected?.id}
                  onSelect={() => {
                    if (initiative.slug) navigate(Routes.strata.initiative(initiative.slug));
                  }}
                />
              ))}
            </div>

            {/* Detail column */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, width: isNarrow ? '100%' : undefined }}>
              {!selected ? null : (
                <>
                  {/* Selected initiative hero (S-162) */}
                  <div data-testid="strata-initiative-hero" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                      <Heading as="h2" size="medium">{selected.name}</Heading>
                      <Lozenge appearance={INITIATIVE_STATUS[selected.status] ?? 'default'}>{labelize(selected.status)}</Lozenge>
                      <CatalystTag text={`Stage · ${labelize(selected.stage)}`} />
                      {ownerProfile?.name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Avatar size="xsmall" name={ownerProfile.name} src={ownerProfile.avatarUrl ?? undefined} />
                          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{ownerProfile.name}</span>
                        </span>
                      ) : null}
                      <span style={{ marginLeft: 'auto' }}>
                        <Button
                          spacing="compact"
                          onClick={() => setDetailInitiativeId(selected.id)}
                          testId="strata-initiative-detail-open"
                        >
                          Details
                        </Button>
                      </span>
                    </div>
                    <StrataStatStrip
                      items={[
                        {
                          key: 'budget',
                          label: 'Budget',
                          value: fmtSarCompact(selected.budget_envelope),
                          caption: selected.budget_envelope != null ? 'Approved envelope' : undefined,
                        },
                        { key: 'projects', label: 'Project cards', value: linkedProjects.length },
                        { key: 'kpis', label: 'Linked KPIs', value: linkedKpis.length },
                      ]}
                    />
                  </div>

                  <StrataPanel title="Strategy linkage" icon={<GitBranch size={16} />} testId="strata-strategy-linkage">
                    {linkedElements.length === 0 && linkedKpis.length === 0 ? (
                      <EmptyState
                        size="compact"
                        header="Not linked to strategy yet"
                        description="Link this initiative to strategy elements and KPIs to trace contribution."
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, marginBottom: 8 }}>Linked elements</div>
                          {linkedElements.length === 0 ? (
                            <span style={captionStyle}>—</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {linkedElements.map((row) => {
                                const el = elementById.get(row.element_id);
                                const w = row.contribution_weight ?? row.weight ?? null;
                                return (
                                  <CatalystTag
                                    key={`${row.initiative_id}-${row.element_id}`}
                                    text={`${el?.name ?? '—'}${w != null ? ` · ${(w <= 1 ? w * 100 : w).toFixed(0)}%` : ''}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, marginBottom: 8 }}>Linked KPIs</div>
                          {linkedKpis.length === 0 ? (
                            <span style={captionStyle}>—</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {linkedKpis.map((row) => {
                                const kpi = kpiById.get(row.kpi_id);
                                if (!kpi) return <span key={row.kpi_id} style={captionStyle}>—</span>;
                                return (
                                  <Button
                                    key={row.kpi_id}
                                    appearance="subtle"
                                    spacing="compact"
                                    isDisabled={!kpi.slug}
                                    onClick={() => { if (kpi.slug) navigate(Routes.strata.kpi(kpi.slug)); }}
                                  >
                                    {kpi.name}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </StrataPanel>

                  <StrataPanel title="Project cards" icon={<Rocket size={16} />} count={linkedProjects.length || null} testId="strata-project-cards">
                    {linkedProjects.length === 0 ? (
                      <EmptyState
                        size="compact"
                        header="No project cards mapped"
                        description="Project cards from Jira, uploads, manual entry or APIs appear here once mapped to this initiative."
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {linkedProjects.map((link) => {
                          const card = cardById.get(link.project_card_id);
                          if (!card) return null;
                          return (
                            <ProjectCardItem
                              key={link.id}
                              card={card}
                              mappingConfidence={link.mapping_confidence}
                              onOpenDetail={() => setDetailProjectId(card.id)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </StrataPanel>
                </>
              )}
            </div>
          </div>

          {/* Dependencies — full width, all initiatives (S-153, S-163) */}
          <div style={{ marginTop: 16 }}>
            <StrataPanel
              title="Dependencies — all initiatives"
              icon={<GitBranch size={16} />}
              count={dependencies.length || null}
              actions={canWrite ? (
                <Button spacing="compact" onClick={() => setPageForm('new-dependency')} testId="strata-new-dependency">
                  New dependency
                </Button>
              ) : undefined}
              testId="strata-dependencies"
              noPadding
            >
              {dependenciesQ.isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner aria-label="Loading dependencies" /></div>
              ) : dependenciesQ.isError ? (
                <div style={{ padding: 16 }}>
                  <SectionMessage appearance="error" title="Could not load dependencies">
                    <p>{(dependenciesQ.error as Error | null)?.message ?? 'Unknown error'}</p>
                  </SectionMessage>
                </div>
              ) : dependencies.length === 0 ? (
                <div style={{ padding: 16 }}>
                  <EmptyState size="compact" header="No dependencies" description="Cross-initiative and external dependencies appear here." />
                </div>
              ) : (
                <JiraTable<StrataDependency>
                  columns={dependencyColumns}
                  data={dependencies}
                  getRowId={(row) => row.id}
                  density="compact"
                  showRowCount={false}
                  rowsPerPage={100}
                  ariaLabel="Dependencies — all initiatives"
                />
              )}
            </StrataPanel>
          </div>
        </>
      )}

      {/* ── Authoring modals (Lanes C+D) — server-validated RPCs only ── */}
      <StrataFormModal
        open={pageForm === 'new-initiative'}
        onClose={() => setPageForm(null)}
        title="New initiative"
        description={activeCycle ? `Created in cycle "${activeCycle.name}".` : undefined}
        submitLabel="Create"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          { key: 'description', label: 'Description', kind: 'textarea' },
          { key: 'sponsorId', label: 'Sponsor', kind: 'user' },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'stage', label: 'Stage', kind: 'text', placeholder: 'proposed', helper: 'Governed stage taxonomy — free text' },
          { key: 'budgetEnvelope', label: 'Budget envelope (SAR)', kind: 'number', min: 0 },
          { key: 'businessCase', label: 'Business case', kind: 'textarea' },
          { key: 'valueHypothesis', label: 'Value hypothesis', kind: 'textarea' },
        ]}
        onSubmit={submitAndRefresh((v) => executionApi.createInitiative({
          name: String(v.name ?? '').trim(), cycleId: activeCycle?.id,
          description: fvStr(v.description), sponsorId: fvStr(v.sponsorId), ownerId: fvStr(v.ownerId),
          stage: fvStr(v.stage), budgetEnvelope: fvNum(v.budgetEnvelope),
          businessCase: fvStr(v.businessCase), valueHypothesis: fvStr(v.valueHypothesis),
        }))}
        testId="strata-initiative-create-modal"
      />

      <StrataFormModal
        open={pageForm === 'new-project'}
        onClose={() => setPageForm(null)}
        title="New project card"
        description="Project cards are source-agnostic: manual cards need no source key."
        submitLabel="Create"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'sourceSystem', label: 'Source system', kind: 'select', required: true,
            options: [
              { value: 'manual', label: 'Manual' },
              { value: 'jira', label: 'Jira' },
              { value: 'upload', label: 'Upload' },
              { value: 'api', label: 'API' },
            ],
          },
          { key: 'sourceKey', label: 'Source key', kind: 'text', helper: 'Required for Jira / Upload / API sources; not used for Manual' },
          { key: 'pmId', label: 'Project manager', kind: 'user' },
          { key: 'sector', label: 'Sector', kind: 'text' },
          { key: 'budget', label: 'Budget (SAR)', kind: 'number', min: 0 },
          { key: 'baselineStart', label: 'Baseline start', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline end', kind: 'date' },
          { key: 'forecastEnd', label: 'Forecast end', kind: 'date' },
          { key: 'stage', label: 'Stage', kind: 'text', placeholder: 'planning', helper: 'Governed stage taxonomy — free text' },
          {
            key: 'executionHealth', label: 'Execution health', kind: 'select',
            options: [
              { value: 'on_track', label: 'On track' },
              { value: 'at_risk', label: 'At risk' },
              { value: 'off_track', label: 'Off track' },
            ],
            helper: 'Leave empty when unknown',
          },
        ]}
        initial={{ sourceSystem: 'manual' }}
        onSubmit={submitAndRefresh(async (v) => {
          const sourceSystem = (fvStr(v.sourceSystem) ?? 'manual') as 'manual' | 'upload' | 'api' | 'jira';
          const sourceKey = fvStr(v.sourceKey);
          if (sourceSystem !== 'manual' && !sourceKey) {
            throw new Error(`Source key is required for ${SOURCE_LABEL[sourceSystem]} project cards.`);
          }
          return executionApi.createProjectCard({
            name: String(v.name ?? '').trim(), sourceSystem,
            sourceKey: sourceSystem === 'manual' ? undefined : sourceKey,
            pmId: fvStr(v.pmId), sector: fvStr(v.sector), budget: fvNum(v.budget),
            baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd),
            forecastEnd: fvStr(v.forecastEnd), stage: fvStr(v.stage),
            executionHealth: fvStr(v.executionHealth),
          });
        })}
        testId="strata-project-create-modal"
      />

      <StrataFormModal
        open={pageForm === 'new-dependency'}
        onClose={() => setPageForm(null)}
        title="New dependency"
        submitLabel="Create"
        fields={[
          {
            key: 'requestingType', label: 'Requesting type', kind: 'select', required: true,
            options: [
              { value: 'initiative', label: 'Initiative' },
              { value: 'project_card', label: 'Project card' },
            ],
          },
          {
            key: 'requestingInitiativeId', label: 'Requesting initiative', kind: 'select',
            helper: 'Used when requesting type is Initiative',
            options: initiatives.map((i) => ({ value: i.id, label: i.name })),
          },
          {
            key: 'requestingProjectId', label: 'Requesting project card', kind: 'select',
            helper: 'Used when requesting type is Project card',
            options: projectCards.map((p) => ({ value: p.id, label: p.name })),
          },
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
            options: projectCards.map((p) => ({ value: p.id, label: p.name })),
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
        initial={{
          requestingType: 'initiative',
          requestingInitiativeId: selected?.id ?? null,
          servingType: 'external',
          dependencyType: 'delivery',
        }}
        onSubmit={submitAndRefresh(async (v) => {
          const requestingType = String(v.requestingType) as 'initiative' | 'project_card';
          const requestingId = requestingType === 'initiative'
            ? fvStr(v.requestingInitiativeId)
            : fvStr(v.requestingProjectId);
          if (!requestingId) {
            throw new Error(`Pick the requesting ${requestingType === 'initiative' ? 'initiative' : 'project card'}.`);
          }
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
            requestingType, requestingId, servingType, servingId,
            servingLabel: fvStr(v.servingLabel), dependencyType: fvStr(v.dependencyType),
            dueDate: fvStr(v.dueDate), slaDays: fvNum(v.slaDays),
            impact: fvStr(v.impact), isBlocker: Boolean(v.isBlocker),
          });
        })}
        testId="strata-dependency-create-modal"
      />

      {/* ── Detail modals (tabbed, x-large) — entities from live query data ── */}
      {detailInitiative ? (
        <InitiativeDetailModal initiative={detailInitiative} onClose={() => setDetailInitiativeId(null)} />
      ) : null}
      {detailProject ? (
        <ProjectDetailModal card={detailProject} onClose={() => setDetailProjectId(null)} />
      ) : null}
    </StrataPageShell>
  );
}
