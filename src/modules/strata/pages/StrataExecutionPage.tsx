/**
 * STRATA Execution page — Strategic Theme → Project Card (Execution
 * Reconciliation Report, CAT-STRATA-EXECUTION-RECONCILE-20260706).
 * Routes: /strata/execution (Theme-grouped Project Card list) and
 * /strata/execution/:slug (Project Card detail — route-based, not a modal).
 *
 * Project Card is the sole execution object (rule 1) — there is no
 * Initiative rail/hero/detail here. The Initiative model is kept for
 * backward compatibility (RPCs + table untouched) but is no longer part of
 * the active Execution UI (rule 16).
 *
 * UI renders server-calculated values only: actual_progress / execution_health
 * come from the DB calc engine. Zero-assumption: '—' for unknowns.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button, CatalystTag, EmptyState, Lozenge, ProgressBar, SectionMessage, Select, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { GitBranch, TrendingDown, TrendingUp } from '@/lib/atlaskit-icons';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import {
  StrataBandLozenge, StrataChipMenu, StrataPageShell, StrataPanel, StrataStatStrip, T,
} from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import type { StrataFormValues } from '@/modules/strata/components/authoring';
import { ProjectCardDetailView } from '@/modules/strata/components/ProjectCardDetailView';
import { executionApi } from '@/modules/strata/domain';
import { fmtDate, fmtPct, fmtRatioPct, labelize } from '@/modules/strata/components/format';
import {
  useDependencies, useInvalidateStrata, useMilestones, useProfileNames, useProjectCardBySlug,
  useProjectCardPicklists, useProjectCards, useStrataContext, useStrataRoles, useStrategyElements,
  useThresholdSchemes,
} from '@/modules/strata/hooks/useStrata';
import type {
  StrataDependency, StrataMilestone, StrataProjectCard, StrataRole, StrataStrategyElement, ThresholdBand,
} from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

const MILESTONE_STATUS: Record<StrataMilestone['status'], 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new'> = {
  done: 'success', in_progress: 'inprogress', planned: 'default', missed: 'removed', descoped: 'default',
};
const DEPENDENCY_STATUS: Record<StrataDependency['status'], 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new'> = {
  open: 'default', at_risk: 'moved', blocked: 'removed', resolved: 'success', cancelled: 'default',
};
const SOURCE_LABEL: Record<StrataProjectCard['source_system'], string> = {
  jira: 'Jira', manual: 'Manual', upload: 'Upload', api: 'API',
};

const WRITE_ROLES: StrataRole[] = ['strategy_office', 'vmo_validator', 'data_steward', 'strata_admin'];

const fvStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
const fvNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const DEPENDENCY_TYPE_OPTIONS = ['delivery', 'data', 'decision', 'resource', 'external'];
// Dependency status is a fixed DB CHECK enum (system state — types.ts), not governed config;
// this mirrors the exact set already hardcoded in DEPENDENCY_STATUS above.
const DEPENDENCY_STATUS_FILTER_OPTIONS: StrataDependency['status'][] = ['open', 'at_risk', 'blocked', 'resolved', 'cancelled'];

const Dash = () => <span style={{ color: T.subtlest }}>—</span>;

const asFraction = (v: number | null | undefined): number | null =>
  v == null ? null : Math.max(0, Math.min(1, v > 1 ? v / 100 : v));

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

const isPast = (d: string | null | undefined): boolean => !!d && new Date(d).getTime() < Date.now();

const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };

// ── Execution View Switcher ──────────────────────────────────────────────────
// "View by" re-groups the SAME Project Card / Dependency dataset by a different
// accountability lens. The switcher controls grouping; filters (below) narrow
// the dataset — the two are never conflated.
type ExecutionView = 'enterprise' | 'business_unit' | 'theme' | 'pm' | 'delivery_team' | 'dependency';
const EXECUTION_VIEW_OPTIONS: { key: ExecutionView; label: string }[] = [
  { key: 'enterprise', label: 'Enterprise' },
  { key: 'business_unit', label: 'Leading Business Unit' },
  { key: 'theme', label: 'Strategic Theme' },
  { key: 'pm', label: 'Project Manager' },
  { key: 'delivery_team', label: 'Delivery Team' },
  { key: 'dependency', label: 'Dependency Accountability' },
];
const EXECUTION_VIEW_LABEL: Record<ExecutionView, string> = Object.fromEntries(
  EXECUTION_VIEW_OPTIONS.map((o) => [o.key, o.label]),
) as Record<ExecutionView, string>;
const isExecutionView = (v: string | null): v is ExecutionView =>
  !!v && EXECUTION_VIEW_OPTIONS.some((o) => o.key === v);

// Delivery Health rollup buckets. `execution_health` is a governed band KEY
// (strata_threshold_schemes.bands, org-defined — today's seed uses
// green/amber/red, but keys/labels/count are config, never a fixed enum — D-018).
// Buckets are resolved by RANK against the governed bands, never by literal
// key-string comparison, so this holds under any org's band configuration.
type HealthBucket = 'on_track' | 'minor_delay' | 'major_delay' | 'unknown';
const HEALTH_BUCKET_LABEL: Record<HealthBucket, string> = {
  on_track: 'On Track', minor_delay: 'Minor Delay', major_delay: 'Major Delay', unknown: 'Unknown health',
};
const HEALTH_BUCKET_TONE: Record<HealthBucket, string> = {
  on_track: 'var(--ds-text-success)', minor_delay: 'var(--ds-text-warning)',
  major_delay: 'var(--ds-text-danger)', unknown: T.subtlest,
};

function useHealthBands(): ThresholdBand[] {
  const schemesQ = useThresholdSchemes();
  return useMemo(() => {
    const map = new Map<string, ThresholdBand>();
    (schemesQ.data ?? []).forEach((s) => (s.bands ?? []).forEach((b) => { if (!map.has(b.key)) map.set(b.key, b); }));
    return Array.from(map.values()).sort((a, b) => b.min_score - a.min_score);
  }, [schemesQ.data]);
}

function healthBucketOf(bandKey: string | null | undefined, bands: ThresholdBand[]): HealthBucket {
  if (!bandKey || bands.length === 0) return 'unknown';
  const idx = bands.findIndex((b) => b.key === bandKey);
  if (idx === -1) return 'unknown';
  if (idx === 0) return 'on_track';
  if (idx === bands.length - 1) return 'major_delay';
  return 'minor_delay';
}

// Dependency status is a fixed DB CHECK enum (system state, not governed
// config — types.ts). "Closed" (never counted as an open blocker) is
// resolved/cancelled; every other status is still open.
const isOpenBlocker = (d: StrataDependency): boolean =>
  d.is_blocker && d.status !== 'resolved' && d.status !== 'cancelled';

interface CardRollup {
  total: number;
  onTrack: number;
  minorDelay: number;
  majorDelay: number;
  unknownHealth: number;
  avgProgress: number | null;
  blockedDependencies: number;
}

function computeCardRollup(cards: StrataProjectCard[], dependencies: StrataDependency[], bands: ThresholdBand[]): CardRollup {
  const ids = new Set(cards.map((c) => c.id));
  let onTrack = 0; let minorDelay = 0; let majorDelay = 0; let unknownHealth = 0;
  let progressSum = 0; let progressCount = 0;
  cards.forEach((c) => {
    const bucket = healthBucketOf(c.execution_health, bands);
    if (bucket === 'on_track') onTrack += 1;
    else if (bucket === 'minor_delay') minorDelay += 1;
    else if (bucket === 'major_delay') majorDelay += 1;
    else unknownHealth += 1;
    const frac = asFraction(c.actual_progress);
    if (frac != null) { progressSum += frac; progressCount += 1; }
  });
  const blockedDependencies = dependencies.filter((d) => isOpenBlocker(d) && (
    (d.requesting_type === 'project_card' && ids.has(d.requesting_id))
    || (d.serving_type === 'project_card' && !!d.serving_id && ids.has(d.serving_id))
  )).length;
  return {
    total: cards.length, onTrack, minorDelay, majorDelay, unknownHealth,
    avgProgress: progressCount > 0 ? progressSum / progressCount : null, blockedDependencies,
  };
}

interface CardGroup { key: string; label: string; cards: StrataProjectCard[] }

/** Generic group-by for the LOB/PM/Delivery Team views — only groups with ≥1 card, plus a
 * trailing "Unassigned" bucket (never hidden, per business rule). */
function groupCards(
  cards: StrataProjectCard[],
  keyFn: (c: StrataProjectCard) => string | null,
  labelFn: (key: string) => string,
  unassignedLabel: string,
): CardGroup[] {
  const groups = new Map<string, CardGroup>();
  const unassigned: StrataProjectCard[] = [];
  cards.forEach((c) => {
    const k = keyFn(c);
    if (!k) { unassigned.push(c); return; }
    const g = groups.get(k) ?? { key: k, label: labelFn(k), cards: [] };
    g.cards.push(c);
    groups.set(k, g);
  });
  const sorted = Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  if (unassigned.length > 0) sorted.push({ key: '__unassigned__', label: unassignedLabel, cards: unassigned });
  return sorted;
}

/** Rollup stat row rendered under every group panel header (LOB/Theme/PM/Delivery Team/Enterprise). */
function GroupStatRow({ rollup, testId }: { rollup: CardRollup; testId?: string }) {
  return (
    <div data-testid={testId} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
      <span style={captionStyle}><strong style={{ color: T.text }}>{rollup.total}</strong> project{rollup.total === 1 ? '' : 's'}</span>
      <span style={{ ...captionStyle, color: HEALTH_BUCKET_TONE.on_track }}><strong>{rollup.onTrack}</strong> on track</span>
      <span style={{ ...captionStyle, color: HEALTH_BUCKET_TONE.minor_delay }}><strong>{rollup.minorDelay}</strong> minor delay</span>
      <span style={{ ...captionStyle, color: HEALTH_BUCKET_TONE.major_delay }}><strong>{rollup.majorDelay}</strong> major delay</span>
      {rollup.unknownHealth > 0 ? <span style={captionStyle}><strong>{rollup.unknownHealth}</strong> unknown health</span> : null}
      <span style={captionStyle}>Avg progress <strong style={{ color: T.text }}>{rollup.avgProgress == null ? '—' : `${Math.round(rollup.avgProgress * 100)}%`}</strong></span>
      <span style={captionStyle}>Blocked deps <strong style={{ color: rollup.blockedDependencies > 0 ? HEALTH_BUCKET_TONE.major_delay : T.text }}>{rollup.blockedDependencies}</strong></span>
    </div>
  );
}

function useIsNarrow(breakpoint = 1024): boolean {
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

// ── Milestones subtable (canonical JiraTable) ────────────────────────────────
const milestoneOverdue = (m: StrataMilestone): boolean =>
  isPast(m.baseline_end) && m.status !== 'done' && m.status !== 'descoped';

function MilestonesSubtable({ projectCardId }: { projectCardId: string }) {
  const milestonesQ = useMilestones(projectCardId);

  const columns = useMemo<Column<StrataMilestone>[]>(() => [
    { id: 'name', label: 'Milestone', flex: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: T.text }}>{row.name}</span> },
    {
      id: 'due', label: 'Due', width: 11,
      cell: ({ row }) => (row.baseline_end
        ? <span style={{ color: milestoneOverdue(row) ? 'var(--ds-text-danger)' : T.subtle, fontWeight: milestoneOverdue(row) ? 600 : 400 }}>{fmtDate(row.baseline_end)}</span>
        : <Dash />),
    },
    {
      id: 'progress', label: 'Progress', width: 12,
      cell: ({ row }) => { const frac = asFraction(row.progress); return frac == null ? <Dash /> : <ProgressBar value={frac} aria-label={`Milestone progress ${Math.round(frac * 100)}%`} />; },
    },
    { id: 'status', label: 'Status', width: 12, cell: ({ row }) => <StatusLozenge status={row.status} appearance={MILESTONE_STATUS[row.status] ?? 'default'} /> },
  ], []);

  if (milestonesQ.isLoading) return <div style={{ padding: 8 }}><Spinner size="small" aria-label="Loading milestones" /></div>;
  if (milestonesQ.isError) return <p style={{ ...captionStyle, color: 'var(--ds-text-danger)' }}>Failed to load milestones.</p>;
  const milestones = milestonesQ.data ?? [];
  if (milestones.length === 0) return <p style={captionStyle}>No milestones recorded for this project card.</p>;
  return (
    <div style={{ marginTop: 8 }} data-testid={`strata-milestones-${projectCardId}`}>
      <JiraTable<StrataMilestone> columns={columns} data={milestones} getRowId={(row) => row.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel="Milestones" />
    </div>
  );
}

// ── Project card item (Theme-grouped list) ───────────────────────────────────
function ProjectCardItem({ card, onOpenDetail }: { card: StrataProjectCard; onOpenDetail: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const milestonesQ = useMilestones(card.id);
  const milestoneCount = milestonesQ.data?.length ?? null;
  const frac = asFraction(card.actual_progress);
  const connectorFed = card.source_system === 'jira' || card.source_system === 'api';
  const synced = connectorFed ? relTime(card.last_synced_at) : null;
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
          <CatalystTag text={`${SOURCE_LABEL[card.source_system] ?? labelize(card.source_system)}${card.source_key ? ` · ${card.source_key}` : ''}`} />
        </div>
        <StrataBandLozenge bandKey={card.execution_health} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {frac == null ? (
          <span style={{ ...captionStyle, fontWeight: 600 }}>Progress —</span>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0 }}><ProgressBar value={frac} aria-label={`Execution progress ${Math.round(frac * 100)}%`} /></div>
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{`${Math.round(frac * 100)}%`}</span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={captionStyle}>Baseline end {fmtDate(card.baseline_end)}</span>
        <span style={captionStyle}>Forecast end {fmtDate(card.forecast_end)}</span>
        {forecastDelta != null && forecastDelta !== 0 ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: forecastDelta > 0 ? 'var(--ds-text-danger)' : 'var(--ds-text-success)' }}>
            {forecastDelta > 0 ? <TrendingDown size={14} color="var(--ds-icon-danger)" /> : <TrendingUp size={14} color="var(--ds-icon-success)" />}
            Forecast {forecastDelta > 0 ? '+' : ''}{forecastDelta} day{Math.abs(forecastDelta) === 1 ? '' : 's'}
          </span>
        ) : null}
        {synced ? <span style={captionStyle}>Synced {synced}</span> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button appearance="subtle" spacing="compact" onClick={() => setExpanded((v) => !v)}>
          {`${expanded ? 'Hide' : 'Show'} milestones${milestoneCount != null ? ` (${milestoneCount})` : ''}`}
        </Button>
        <Button appearance="subtle" spacing="compact" onClick={onOpenDetail} testId={`strata-project-detail-open-${card.slug ?? card.id}`}>
          Details
        </Button>
      </div>
      {expanded ? <MilestonesSubtable projectCardId={card.id} /> : null}
    </div>
  );
}

function CardGrid({ cards, isNarrow, onOpenDetail }: {
  cards: StrataProjectCard[]; isNarrow: boolean; onOpenDetail: (card: StrataProjectCard) => void;
}) {
  return (
    <div style={{ display: isNarrow ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
      {cards.map((card) => (
        <ProjectCardItem key={card.id} card={card} onOpenDetail={() => onOpenDetail(card)} />
      ))}
    </div>
  );
}

/** Compact summary-table columns for the Enterprise view's "By Leading Business Unit" /
 * "By Strategic Theme" breakdown tables — same rollup math as GroupStatRow, one row per group. */
function BREAKDOWN_COLUMNS(dependencies: StrataDependency[], bands: ThresholdBand[]): Column<CardGroup>[] {
  return [
    { id: 'label', label: 'Group', flex: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: T.text }}>{row.label}</span> },
    { id: 'total', label: 'Total', width: 10, align: 'end', cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.cards.length}</span> },
    {
      id: 'on_track', label: 'On Track', width: 12, align: 'end',
      cell: ({ row }) => <span style={{ color: HEALTH_BUCKET_TONE.on_track, fontVariantNumeric: 'tabular-nums' }}>{computeCardRollup(row.cards, dependencies, bands).onTrack}</span>,
    },
    {
      id: 'minor_delay', label: 'Minor Delay', width: 12, align: 'end',
      cell: ({ row }) => <span style={{ color: HEALTH_BUCKET_TONE.minor_delay, fontVariantNumeric: 'tabular-nums' }}>{computeCardRollup(row.cards, dependencies, bands).minorDelay}</span>,
    },
    {
      id: 'major_delay', label: 'Major Delay', width: 12, align: 'end',
      cell: ({ row }) => <span style={{ color: HEALTH_BUCKET_TONE.major_delay, fontVariantNumeric: 'tabular-nums' }}>{computeCardRollup(row.cards, dependencies, bands).majorDelay}</span>,
    },
    {
      id: 'blocked_deps', label: 'Blocked Deps', width: 12, align: 'end',
      cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{computeCardRollup(row.cards, dependencies, bands).blockedDependencies}</span>,
    },
    {
      id: 'avg_progress', label: 'Avg Progress', width: 12, align: 'end',
      cell: ({ row }) => {
        const p = computeCardRollup(row.cards, dependencies, bands).avgProgress;
        return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p == null ? '—' : `${Math.round(p * 100)}%`}</span>;
      },
    },
  ];
}

/** Shared group-panel renderer for the Leading Business Unit / Strategic Theme /
 * Project Manager / Delivery Team views — same panel shape, different grouping key. */
function GroupedCardsSection({ groups, dependencies, bands, isNarrow, onOpenDetail, emptyDescription, testId }: {
  groups: CardGroup[];
  dependencies: StrataDependency[];
  bands: ThresholdBand[];
  isNarrow: boolean;
  onOpenDetail: (card: StrataProjectCard) => void;
  emptyDescription: string;
  testId: string;
}) {
  if (groups.length === 0) {
    return <EmptyState header="No project cards match the current filters" description={emptyDescription} testId={`${testId}-empty`} />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} data-testid={testId}>
      {groups.map((g) => {
        const rollup = computeCardRollup(g.cards, dependencies, bands);
        return (
          <StrataPanel key={g.key} title={g.label} icon={<GitBranch size={16} />} count={g.cards.length || null} testId={`${testId}-${g.key}`}>
            <GroupStatRow rollup={rollup} testId={`${testId}-${g.key}-stats`} />
            {g.cards.length === 0 ? (
              <EmptyState size="compact" header="No project cards in this group" />
            ) : (
              <CardGrid cards={g.cards} isNarrow={isNarrow} onOpenDetail={onOpenDetail} />
            )}
          </StrataPanel>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataExecutionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { activeCycle } = useStrataContext();
  const isNarrow = useIsNarrow();

  const [searchParams, setSearchParams] = useSearchParams();

  const projectCardsQ = useProjectCards();
  const detailCardQ = useProjectCardBySlug(slug);
  const elementsQ = useStrategyElements(activeCycle?.id);
  const dependenciesQ = useDependencies();
  const allMilestonesQ = useMilestones();
  const deliveryStatusPicklistQ = useProjectCardPicklists('delivery_status');
  const lobPicklistQ = useProjectCardPicklists('lead_business_unit');
  const teamPicklistQ = useProjectCardPicklists('delivery_team');
  const profilesQ = useProfileNames();
  const healthBands = useHealthBands();
  const [railFilter, setRailFilter] = useState('');

  // ── View switcher state (bookmarkable — same ?param= convention as ?period=) ──
  const viewParam = searchParams.get('view');
  const view: ExecutionView = isExecutionView(viewParam) ? viewParam : 'enterprise';
  const setView = (next: ExecutionView) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (next === 'enterprise') nextParams.delete('view'); else nextParams.set('view', next);
      return nextParams;
    }, { replace: true });
  };

  // ── Filters (narrow the dataset; independent of the view switcher's grouping) ──
  const [lobFilter, setLobFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [pmFilter, setPmFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthBucket | ''>('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('');
  const [dependencyStatusFilter, setDependencyStatusFilter] = useState('');
  const [blockerOnly, setBlockerOnly] = useState(false);
  const [depDirection, setDepDirection] = useState<'requesting' | 'serving'>('requesting');

  const invalidate = useInvalidateStrata();
  const roles = useStrataRoles().data ?? [];
  const canWrite = roles.some((r) => WRITE_ROLES.includes(r));
  const [pageForm, setPageForm] = useState<'new-project' | 'new-dependency' | null>(null);

  const projectCards = projectCardsQ.data ?? [];
  const elements = elementsQ.data ?? [];
  const dependencies = dependenciesQ.data ?? [];
  const allMilestones = allMilestonesQ.data ?? [];
  const themes = elements.filter((e) => e.element_type === 'theme');

  const isLoading = projectCardsQ.isLoading;
  const isError = projectCardsQ.isError;
  const errorMessage = (projectCardsQ.error as Error | null)?.message ?? 'Unknown error';

  const themeById = new Map<string, StrataStrategyElement>(elements.map((e) => [e.id, e]));
  const cardById = new Map<string, StrataProjectCard>(projectCards.map((c) => [c.id, c]));
  const profileName = (id: string | null) => (id ? profilesQ.data?.get(id)?.name ?? null : null);

  const hasActiveFilters = !!(railFilter.trim() || lobFilter || themeFilter || teamFilter || pmFilter
    || healthFilter || deliveryStatusFilter || dependencyStatusFilter || blockerOnly);
  const clearFilters = () => {
    setRailFilter(''); setLobFilter(''); setThemeFilter(''); setTeamFilter(''); setPmFilter('');
    setHealthFilter(''); setDeliveryStatusFilter(''); setDependencyStatusFilter(''); setBlockerOnly(false);
  };

  const search = railFilter.trim().toLowerCase();
  const filteredCards = projectCards.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search) && !(c.reference_id ?? '').toLowerCase().includes(search)) return false;
    if (lobFilter && (c.lead_business_unit ?? '') !== lobFilter) return false;
    if (themeFilter && c.theme_id !== themeFilter) return false;
    if (teamFilter && (c.delivery_team ?? '') !== teamFilter) return false;
    if (pmFilter && c.pm_id !== pmFilter) return false;
    if (healthFilter && healthBucketOf(c.execution_health, healthBands) !== healthFilter) return false;
    if (deliveryStatusFilter && c.stage !== deliveryStatusFilter) return false;
    return true;
  });
  const filteredCardIds = new Set(filteredCards.map((c) => c.id));

  // Once a project-card-scoping filter (LOB/Theme/Team/PM/Health/Delivery Status) narrows
  // the card set, the dependency lists narrow with it — a dependency stays visible only if
  // it touches a still-in-scope card. With no card filter active, every dependency shows
  // (matches the "all project cards" panel title).
  const cardScopeActive = !!(lobFilter || themeFilter || teamFilter || pmFilter || healthFilter || deliveryStatusFilter);
  const filteredDependencies = dependencies.filter((d) => {
    if (dependencyStatusFilter && d.status !== dependencyStatusFilter) return false;
    if (blockerOnly && !isOpenBlocker(d)) return false;
    if (search) {
      const haystack = `${d.name ?? ''} ${d.description ?? ''} ${d.serving_label ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (cardScopeActive) {
      const touchesRequesting = d.requesting_type === 'project_card' && filteredCardIds.has(d.requesting_id);
      const touchesServing = d.serving_type === 'project_card' && !!d.serving_id && filteredCardIds.has(d.serving_id);
      if (!touchesRequesting && !touchesServing) return false;
    }
    return true;
  });
  const filteredMilestones = allMilestones.filter((m) => filteredCardIds.has(m.project_card_id));

  const cardsByTheme = new Map<string, StrataProjectCard[]>();
  const unassignedCards: StrataProjectCard[] = [];
  filteredCards.forEach((c) => {
    if (c.theme_id && themeById.has(c.theme_id)) {
      const arr = cardsByTheme.get(c.theme_id) ?? [];
      arr.push(c);
      cardsByTheme.set(c.theme_id, arr);
    } else {
      unassignedCards.push(c);
    }
  });

  // Filter dropdown options: union of the admin-configured picklist (canonical labels)
  // and whatever values actually appear on Project Cards today — Lead Business Unit /
  // Delivery Team are free-text-capable fields, so a filter must never show "No options"
  // just because the admin picklist hasn't been seeded for a value already in use.
  const lobOptions = Array.from(new Set([
    ...(lobPicklistQ.data ?? []).map((p) => p.value),
    ...projectCards.map((c) => c.lead_business_unit).filter((v): v is string => !!v),
  ])).map((v) => ({ value: v, label: lobPicklistQ.data?.find((p) => p.value === v)?.label ?? v }));
  const teamOptions = Array.from(new Set([
    ...(teamPicklistQ.data ?? []).map((p) => p.value),
    ...projectCards.map((c) => c.delivery_team).filter((v): v is string => !!v),
  ])).map((v) => ({ value: v, label: teamPicklistQ.data?.find((p) => p.value === v)?.label ?? v }));

  const businessUnitGroups = groupCards(
    filteredCards, (c) => c.lead_business_unit, (k) => k, 'Unassigned',
  );
  const pmGroups = groupCards(
    filteredCards, (c) => c.pm_id, (id) => profileName(id) ?? 'Unknown owner', 'Unassigned PM',
  );
  const deliveryTeamGroups = groupCards(
    filteredCards, (c) => c.delivery_team, (k) => k, 'Unassigned Delivery Team',
  );
  const themeGroups: CardGroup[] = [
    ...themes.map((t) => ({ key: t.id, label: t.name, cards: cardsByTheme.get(t.id) ?? [] })),
    ...(unassignedCards.length > 0 ? [{ key: '__unassigned__', label: 'Unassigned Strategic Theme', cards: unassignedCards }] : []),
  ];

  const enterpriseRollup = computeCardRollup(filteredCards, filteredDependencies, healthBands);
  const enterpriseMilestoneCompletion = filteredMilestones.length > 0
    ? filteredMilestones.filter((m) => m.status === 'done').length / filteredMilestones.length
    : null;

  const resolvePartyName = (type: StrataDependency['requesting_type'] | StrataDependency['serving_type'], id: string | null): string | null => {
    if (!id) return null;
    if (type === 'project_card') return cardById.get(id)?.name ?? null;
    return null;
  };
  /** Card behind a resolved dependency party — used to make Requesting/Serving cells clickable
   * links to the Project Card detail route (satisfies "Related Project Card" without a duplicate column). */
  const partyCard = (type: StrataDependency['requesting_type'] | StrataDependency['serving_type'], id: string | null): StrataProjectCard | null =>
    (type === 'project_card' && id ? cardById.get(id) ?? null : null);

  const dependencyOverdue = (dep: StrataDependency): boolean =>
    isPast(dep.due_date) && (dep.status === 'open' || dep.status === 'at_risk' || dep.status === 'blocked');

  function PartyCell({ type, id, fallback }: {
    type: StrataDependency['requesting_type'] | StrataDependency['serving_type']; id: string | null; fallback?: string | null;
  }) {
    const card = partyCard(type, id);
    const name = resolvePartyName(type, id) ?? fallback;
    if (!name) return <Dash />;
    if (card?.slug) {
      return (
        <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.projectCard(card.slug!))}>
          {name}
        </Button>
      );
    }
    return <span style={{ fontWeight: 600, color: T.text }}>{name}</span>;
  }

  const dependencyColumns: Column<StrataDependency>[] = [
    {
      id: 'name', label: 'Dependency', flex: true,
      cell: ({ row }) => <span style={{ fontWeight: 600, color: T.text }}>{row.name ?? row.description ?? labelize(row.dependency_type)}</span>,
    },
    {
      id: 'requesting', label: 'Requesting project / team', width: 18,
      cell: ({ row }) => <PartyCell type={row.requesting_type} id={row.requesting_id} />,
    },
    {
      id: 'serving', label: 'Serving department / team', width: 18,
      cell: ({ row }) => <PartyCell type={row.serving_type} id={row.serving_id} fallback={row.serving_label} />,
    },
    { id: 'dependency_type', label: 'Type', width: 10, cell: ({ row }) => (row.dependency_type ? <CatalystTag text={labelize(row.dependency_type)} /> : <Dash />) },
    {
      id: 'due_date', label: 'Due', width: 10,
      cell: ({ row }) => (row.due_date
        ? <span style={{ color: dependencyOverdue(row) ? 'var(--ds-text-danger)' : T.subtle, fontWeight: dependencyOverdue(row) ? 600 : 400 }}>{fmtDate(row.due_date)}</span>
        : <Dash />),
    },
    { id: 'sla_days', label: 'SLA', width: 8, align: 'end', cell: ({ row }) => (row.sla_days != null ? <span style={{ color: T.subtle }}>{row.sla_days}d</span> : <Dash />) },
    { id: 'status', label: 'Status', width: 10, cell: ({ row }) => <StatusLozenge status={row.status} appearance={DEPENDENCY_STATUS[row.status] ?? 'default'} /> },
    { id: 'is_blocker', label: 'Blocker', width: 9, cell: ({ row }) => (row.is_blocker ? <Lozenge appearance="removed" isBold>Blocker</Lozenge> : null) },
    {
      id: 'impact', label: 'Impact', flex: true,
      cell: ({ row }) => (row.impact
        ? <Tooltip content={row.impact}><span style={{ display: 'block', color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.impact}</span></Tooltip>
        : <Dash />),
    },
  ];

  /** Dependency Accountability (§6): group the SAME dependency dataset by the resolved
   * Requesting or Serving party — a Project Card when resolvable, else the free-text
   * serving label, else "Unassigned". Legacy `requesting_type/serving_type = 'initiative'`
   * rows are intentionally NOT resolved via strata_initiatives (Initiative stays out of
   * active Execution UI, per rule 16) — they fall into Unassigned, not fabricated. */
  interface DependencyGroup { key: string; label: string; deps: StrataDependency[] }
  const dependencyGroupsFor = (direction: 'requesting' | 'serving'): DependencyGroup[] => {
    const groups = new Map<string, DependencyGroup>();
    const unassigned: StrataDependency[] = [];
    filteredDependencies.forEach((d) => {
      const type = direction === 'requesting' ? d.requesting_type : d.serving_type;
      const id = direction === 'requesting' ? d.requesting_id : d.serving_id;
      const card = partyCard(type, id);
      if (card) {
        const key = `pc:${card.id}`;
        const g = groups.get(key) ?? { key, label: card.name, deps: [] };
        g.deps.push(d);
        groups.set(key, g);
        return;
      }
      const label = direction === 'serving' ? d.serving_label?.trim() : null;
      if (label) {
        const key = `label:${label.toLowerCase()}`;
        const g = groups.get(key) ?? { key, label, deps: [] };
        g.deps.push(d);
        groups.set(key, g);
        return;
      }
      unassigned.push(d);
    });
    const sorted = Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
    if (unassigned.length > 0) sorted.push({ key: '__unassigned__', label: 'Unassigned', deps: unassigned });
    return sorted;
  };

  const detailCard = detailCardQ.data ?? null;
  const detailTheme = detailCard?.theme_id ? themeById.get(detailCard.theme_id) ?? null : null;

  const submitAndRefresh = (fn: (v: StrataFormValues) => Promise<unknown>) =>
    async (v: StrataFormValues) => { await fn(v); invalidate(); };

  return (
    <StrataPageShell
      trail={detailCard ? [{ text: 'Execution', href: Routes.strata.execution() }, { text: detailCard.name }] : undefined}
      hideTitle={!!detailCard}
      docTitle={detailCard ? detailCard.name : undefined}
      headerActions={canWrite ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!detailCard ? (
            <Button spacing="compact" onClick={() => navigate(Routes.strata.executionImport())} testId="strata-execution-import">
              Execution import
            </Button>
          ) : null}
          <Button spacing="compact" appearance="primary" onClick={() => setPageForm('new-project')} testId="strata-new-project-card">
            New project card
          </Button>
        </div>
      ) : undefined}
      testId="strata-execution-chrome"
    >
      {isLoading || (slug && !detailCardQ.isFetched) ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" aria-label="Loading execution data" /></div>
      ) : isError ? (
        <SectionMessage appearance="error" title="Could not load execution data"><p>{errorMessage}</p></SectionMessage>
      ) : slug && detailCardQ.isFetched && !detailCard ? (
        <EmptyState header="Project card not found" description={`No project card matches "${slug}".`} testId="strata-execution-notfound" />
      ) : slug && detailCard ? (
        <ProjectCardDetailView card={detailCard} theme={detailTheme} />
      ) : projectCards.length === 0 ? (
        <EmptyState
          header="No project cards yet"
          description="Project cards appear here once created manually in STRATA or imported/mapped from Jira."
          testId="strata-execution-empty"
        />
      ) : (
        <>
          {/* ── View by switcher + filters ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} data-testid="strata-execution-view-switcher">
            <StrataChipMenu
              label="View by"
              value={EXECUTION_VIEW_LABEL[view]}
              aria-label="Select execution view"
              testId="strata-execution-view-chip"
              options={EXECUTION_VIEW_OPTIONS.map((o) => ({
                key: o.key, label: o.label, isSelected: o.key === view, onClick: () => setView(o.key),
              }))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }} data-testid="strata-execution-filters">
            <div style={{ minWidth: 200 }}>
              <Textfield
                spacing="compact"
                placeholder="Search project cards, dependencies"
                value={railFilter}
                onChange={(e) => setRailFilter((e.target as HTMLInputElement).value)}
                aria-label="Search execution data"
              />
            </div>
            <Select
              placeholder="Leading Business Unit"
              aria-label="Filter by leading business unit"
              width="small"
              isClearable
              value={lobFilter ? { value: lobFilter, label: lobFilter } : null}
              onChange={(o) => setLobFilter(o?.value ?? '')}
              options={lobOptions}
            />
            <Select
              placeholder="Strategic Theme"
              aria-label="Filter by strategic theme"
              width="small"
              isClearable
              value={themeFilter ? { value: themeFilter, label: themeById.get(themeFilter)?.name ?? themeFilter } : null}
              onChange={(o) => setThemeFilter(o?.value ?? '')}
              options={themes.map((t) => ({ value: t.id, label: t.name }))}
            />
            <Select
              placeholder="Delivery Team"
              aria-label="Filter by delivery team"
              width="small"
              isClearable
              value={teamFilter ? { value: teamFilter, label: teamFilter } : null}
              onChange={(o) => setTeamFilter(o?.value ?? '')}
              options={teamOptions}
            />
            <Select
              placeholder="Project Manager"
              aria-label="Filter by project manager"
              width="small"
              isClearable
              value={pmFilter ? { value: pmFilter, label: profileName(pmFilter) ?? pmFilter } : null}
              onChange={(o) => setPmFilter(o?.value ?? '')}
              options={Array.from(new Set(projectCards.map((c) => c.pm_id).filter((v): v is string => !!v)))
                .map((id) => ({ value: id, label: profileName(id) ?? 'Unknown owner' }))}
            />
            <Select
              placeholder="Delivery Health"
              aria-label="Filter by delivery health"
              width="small"
              isClearable
              value={healthFilter ? { value: healthFilter, label: HEALTH_BUCKET_LABEL[healthFilter] } : null}
              onChange={(o) => setHealthFilter((o?.value as HealthBucket | undefined) ?? '')}
              options={(['on_track', 'minor_delay', 'major_delay', 'unknown'] as HealthBucket[]).map((k) => ({ value: k, label: HEALTH_BUCKET_LABEL[k] }))}
            />
            <Select
              placeholder="Delivery Status"
              aria-label="Filter by delivery status"
              width="small"
              isClearable
              value={deliveryStatusFilter ? { value: deliveryStatusFilter, label: labelize(deliveryStatusFilter) } : null}
              onChange={(o) => setDeliveryStatusFilter(o?.value ?? '')}
              options={(deliveryStatusPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label }))}
            />
            <Select
              placeholder="Dependency Status"
              aria-label="Filter by dependency status"
              width="small"
              isClearable
              value={dependencyStatusFilter ? { value: dependencyStatusFilter, label: labelize(dependencyStatusFilter) } : null}
              onChange={(o) => setDependencyStatusFilter(o?.value ?? '')}
              options={DEPENDENCY_STATUS_FILTER_OPTIONS.map((s) => ({ value: s, label: labelize(s) }))}
            />
            <Button
              appearance={blockerOnly ? 'primary' : 'default'}
              spacing="compact"
              onClick={() => setBlockerOnly((v) => !v)}
              testId="strata-filter-blocker-only"
              aria-pressed={blockerOnly}
            >
              Blocker only
            </Button>
            {hasActiveFilters ? (
              <Button appearance="subtle" spacing="compact" onClick={clearFilters} testId="strata-clear-filters">
                Clear filters
              </Button>
            ) : null}
          </div>

          {view === 'enterprise' ? (
            <>
              <StrataStatStrip
                testId="strata-enterprise-stats-1"
                items={[
                  { key: 'total', label: 'Total Project Cards', value: enterpriseRollup.total },
                  { key: 'on_track', label: 'On Track', value: enterpriseRollup.onTrack },
                  { key: 'minor_delay', label: 'Minor Delay', value: enterpriseRollup.minorDelay },
                  { key: 'major_delay', label: 'Major Delay', value: enterpriseRollup.majorDelay },
                ]}
              />
              <StrataStatStrip
                testId="strata-enterprise-stats-2"
                items={[
                  { key: 'blocked_deps', label: 'Blocked Dependencies', value: enterpriseRollup.blockedDependencies },
                  { key: 'avg_progress', label: 'Average Progress', value: enterpriseRollup.avgProgress == null ? '—' : `${Math.round(enterpriseRollup.avgProgress * 100)}%` },
                  { key: 'milestone_completion', label: 'Milestone Completion', value: enterpriseMilestoneCompletion == null ? '—' : `${Math.round(enterpriseMilestoneCompletion * 100)}%` },
                  { key: 'unassigned', label: 'Unassigned Projects', value: unassignedCards.length },
                ]}
              />

              <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
                <StrataPanel title="By Leading Business Unit" icon={<GitBranch size={16} />} count={businessUnitGroups.length || null} testId="strata-enterprise-breakdown-lob" noPadding>
                  {businessUnitGroups.length === 0 ? (
                    <div style={{ padding: 16 }}><EmptyState size="compact" header="No project cards" /></div>
                  ) : (
                    <JiraTable<CardGroup>
                      columns={BREAKDOWN_COLUMNS(filteredDependencies, healthBands)}
                      data={businessUnitGroups}
                      getRowId={(row) => row.key}
                      density="compact"
                      showRowCount={false}
                      rowsPerPage={50}
                      ariaLabel="Breakdown by Leading Business Unit"
                    />
                  )}
                </StrataPanel>
                <StrataPanel title="By Strategic Theme" icon={<GitBranch size={16} />} count={themeGroups.length || null} testId="strata-enterprise-breakdown-theme" noPadding>
                  {themeGroups.length === 0 ? (
                    <div style={{ padding: 16 }}><EmptyState size="compact" header="No strategic themes" /></div>
                  ) : (
                    <JiraTable<CardGroup>
                      columns={BREAKDOWN_COLUMNS(filteredDependencies, healthBands)}
                      data={themeGroups}
                      getRowId={(row) => row.key}
                      density="compact"
                      showRowCount={false}
                      rowsPerPage={50}
                      ariaLabel="Breakdown by Strategic Theme"
                    />
                  )}
                </StrataPanel>
              </div>

              <GroupedCardsSection
                groups={themeGroups}
                dependencies={filteredDependencies}
                bands={healthBands}
                isNarrow={isNarrow}
                onOpenDetail={(card) => { if (card.slug) navigate(Routes.strata.projectCard(card.slug)); }}
                emptyDescription="Adjust or clear filters to see project cards."
                testId="strata-execution-theme-groups"
              />
            </>
          ) : view === 'business_unit' ? (
            <GroupedCardsSection
              groups={businessUnitGroups}
              dependencies={filteredDependencies}
              bands={healthBands}
              isNarrow={isNarrow}
              onOpenDetail={(card) => { if (card.slug) navigate(Routes.strata.projectCard(card.slug)); }}
              emptyDescription="Adjust or clear filters to see project cards."
              testId="strata-execution-lob-groups"
            />
          ) : view === 'theme' ? (
            <GroupedCardsSection
              groups={themeGroups}
              dependencies={filteredDependencies}
              bands={healthBands}
              isNarrow={isNarrow}
              onOpenDetail={(card) => { if (card.slug) navigate(Routes.strata.projectCard(card.slug)); }}
              emptyDescription="Adjust or clear filters to see project cards."
              testId="strata-execution-theme-groups"
            />
          ) : view === 'pm' ? (
            <GroupedCardsSection
              groups={pmGroups}
              dependencies={filteredDependencies}
              bands={healthBands}
              isNarrow={isNarrow}
              onOpenDetail={(card) => { if (card.slug) navigate(Routes.strata.projectCard(card.slug)); }}
              emptyDescription="Adjust or clear filters to see project cards."
              testId="strata-execution-pm-groups"
            />
          ) : view === 'delivery_team' ? (
            <GroupedCardsSection
              groups={deliveryTeamGroups}
              dependencies={filteredDependencies}
              bands={healthBands}
              isNarrow={isNarrow}
              onOpenDetail={(card) => { if (card.slug) navigate(Routes.strata.projectCard(card.slug)); }}
              emptyDescription="Adjust or clear filters to see project cards."
              testId="strata-execution-team-groups"
            />
          ) : (
            <div data-testid="strata-execution-dependency-accountability">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <Button
                  appearance={depDirection === 'requesting' ? 'primary' : 'default'}
                  spacing="compact"
                  onClick={() => setDepDirection('requesting')}
                  testId="strata-dep-direction-requesting"
                >
                  Requested by
                </Button>
                <Button
                  appearance={depDirection === 'serving' ? 'primary' : 'default'}
                  spacing="compact"
                  onClick={() => setDepDirection('serving')}
                  testId="strata-dep-direction-serving"
                >
                  Requested from
                </Button>
              </div>
              {dependencyGroupsFor(depDirection).length === 0 ? (
                <EmptyState header="No dependencies match the current filters" testId="strata-dep-accountability-empty" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {dependencyGroupsFor(depDirection).map((g) => (
                    <StrataPanel key={g.key} title={g.label} icon={<GitBranch size={16} />} count={g.deps.length || null} testId={`strata-dep-group-${g.key}`} noPadding>
                      <JiraTable<StrataDependency>
                        columns={dependencyColumns}
                        data={g.deps}
                        getRowId={(row) => row.id}
                        density="compact"
                        showRowCount={false}
                        rowsPerPage={100}
                        ariaLabel={`Dependencies — ${g.label}`}
                      />
                    </StrataPanel>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delivery Dependencies — full width, all project cards (every view except
              Dependency Accountability, which already renders the full dependency set grouped) */}
          {view !== 'dependency' ? (
            <div style={{ marginTop: 16 }}>
              <StrataPanel
                title="Delivery Dependencies — all project cards"
                icon={<GitBranch size={16} />}
                count={filteredDependencies.length || null}
                actions={canWrite ? <Button spacing="compact" onClick={() => setPageForm('new-dependency')} testId="strata-new-dependency">New dependency</Button> : undefined}
                testId="strata-dependencies"
                noPadding
              >
                {dependenciesQ.isLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner aria-label="Loading dependencies" /></div>
                ) : dependenciesQ.isError ? (
                  <div style={{ padding: 16 }}><SectionMessage appearance="error" title="Could not load dependencies"><p>{(dependenciesQ.error as Error | null)?.message ?? 'Unknown error'}</p></SectionMessage></div>
                ) : filteredDependencies.length === 0 ? (
                  <div style={{ padding: 16 }}><EmptyState size="compact" header="No dependencies" description="Delivery dependencies appear here." /></div>
                ) : (
                  <JiraTable<StrataDependency> columns={dependencyColumns} data={filteredDependencies} getRowId={(row) => row.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel="Delivery Dependencies — all project cards" />
                )}
              </StrataPanel>
            </div>
          ) : null}
        </>
      )}

      {/* ── Authoring modals ── */}
      <StrataFormModal
        open={pageForm === 'new-project'}
        onClose={() => setPageForm(null)}
        title="New project card"
        description="A Project Card can be created directly in STRATA or imported/mapped from Jira."
        submitLabel="Create"
        fields={[
          { key: 'name', label: 'Project Name', kind: 'text', required: true },
          {
            key: 'sourceSystem', label: 'Source System', kind: 'select', required: true,
            options: [
              { value: 'manual', label: 'Manual' },
              { value: 'jira', label: 'Jira' },
              { value: 'upload', label: 'Upload' },
              { value: 'api', label: 'API' },
            ],
          },
          { key: 'sourceKey', label: 'Source Reference Key', kind: 'text', helper: 'Required for Jira / Upload / API sources; not used for Manual' },
          {
            key: 'themeId', label: 'Strategic Theme', kind: 'select', required: true,
            options: themes.map((t) => ({ value: t.id, label: t.name })),
            helper: 'Every Project Card belongs to exactly one Strategic Theme by default',
          },
          { key: 'pmId', label: 'Project Manager', kind: 'user' },
          { key: 'businessOwnerId', label: 'Business Owner', kind: 'user' },
          {
            key: 'stage', label: 'Delivery Status', kind: 'select',
            options: (deliveryStatusPicklistQ.data ?? []).map((p) => ({ value: p.value, label: p.label })),
          },
          { key: 'baselineStart', label: 'Baseline start', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline end', kind: 'date' },
          { key: 'forecastEnd', label: 'Forecast end', kind: 'date' },
          { key: 'scopeDescription', label: 'Scope Description', kind: 'textarea' },
        ]}
        initial={{ sourceSystem: 'manual' }}
        onSubmit={submitAndRefresh(async (v) => {
          const sourceSystem = (fvStr(v.sourceSystem) ?? 'manual') as 'manual' | 'upload' | 'api' | 'jira';
          const sourceKey = fvStr(v.sourceKey);
          if (sourceSystem !== 'manual' && !sourceKey) {
            throw new Error(`Source Reference Key is required for ${SOURCE_LABEL[sourceSystem]} project cards.`);
          }
          return executionApi.createProjectCard({
            name: String(v.name ?? '').trim(), sourceSystem,
            sourceKey: sourceSystem === 'manual' ? undefined : sourceKey,
            themeId: fvStr(v.themeId), pmId: fvStr(v.pmId), businessOwnerId: fvStr(v.businessOwnerId),
            stage: fvStr(v.stage), baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd),
            forecastEnd: fvStr(v.forecastEnd), scopeDescription: fvStr(v.scopeDescription),
          });
        })}
        testId="strata-project-create-modal"
      />

      <StrataFormModal
        open={pageForm === 'new-dependency'}
        onClose={() => setPageForm(null)}
        title="New delivery dependency"
        submitLabel="Create"
        fields={[
          { key: 'description', label: 'Dependency Description', kind: 'textarea' },
          {
            key: 'requestingProjectId', label: 'Requesting Project / Team', kind: 'select', required: true,
            options: projectCards.map((p) => ({ value: p.id, label: p.name })),
          },
          { key: 'servingLabel', label: 'Serving Department / Team', kind: 'text', required: true },
          { key: 'dependencyType', label: 'Dependency Type', kind: 'select', required: true, options: DEPENDENCY_TYPE_OPTIONS.map((t) => ({ value: t, label: labelize(t) })) },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'baselineStart', label: 'Baseline Start Date', kind: 'date' },
          { key: 'baselineEnd', label: 'Baseline End Date', kind: 'date' },
          { key: 'dueDate', label: 'Due date', kind: 'date' },
          { key: 'impact', label: 'Blocker / Impact Note', kind: 'textarea' },
          { key: 'isBlocker', label: 'Blocker', kind: 'checkbox', placeholder: 'This dependency blocks delivery' },
        ]}
        initial={{ dependencyType: 'delivery' }}
        onSubmit={submitAndRefresh(async (v) => {
          const requestingId = fvStr(v.requestingProjectId);
          if (!requestingId) throw new Error('Pick the requesting project.');
          return executionApi.createDependency({
            requestingType: 'project_card', requestingId, servingType: 'external',
            servingLabel: fvStr(v.servingLabel), description: fvStr(v.description),
            dependencyType: fvStr(v.dependencyType), ownerId: fvStr(v.ownerId),
            baselineStart: fvStr(v.baselineStart), baselineEnd: fvStr(v.baselineEnd), dueDate: fvStr(v.dueDate),
            impact: fvStr(v.impact), isBlocker: Boolean(v.isBlocker),
          });
        })}
        testId="strata-dependency-create-modal"
      />
    </StrataPageShell>
  );
}
