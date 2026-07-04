/**
 * STRATA Execution page — Initiative ↔ Project Card linkage (CAT-STRATA-20260705-001).
 * Routes: /strata/execution and /strata/execution/:slug.
 *
 * Master-detail: initiatives rail (left) → detail column (strategy linkage,
 * project cards — the source-agnostic showcase) → dependencies (full width).
 * UI renders server-calculated values only: actual_progress / execution_health
 * come from the DB calc engine. Zero-assumption: '—' for unknowns.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Lozenge, ProgressBar, SectionMessage, Spinner } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import { StrataBandLozenge, StrataConfigContextBar, StrataPanel } from '@/modules/strata/components/shared';
import {
  useDependencies, useInitiativeElements, useInitiativeKpis, useInitiativeProjects,
  useInitiatives, useKpis, useMilestones, useProjectCards, useStrataContext, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import type {
  StrataDependency, StrataInitiative, StrataInitiativeProject, StrataKpi,
  StrataMilestone, StrataProjectCard, StrataStrategyElement,
} from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

// ── System-state lozenge maps (mirror DB CHECK constraints) ──────────────────
const INITIATIVE_STATUS: Record<StrataInitiative['status'], LozengeAppearance> = {
  active: 'inprogress', on_hold: 'moved', completed: 'success', stopped: 'removed', draft: 'default',
};
const MILESTONE_STATUS: Record<StrataMilestone['status'], LozengeAppearance> = {
  done: 'success', in_progress: 'inprogress', planned: 'default', missed: 'removed', descoped: 'default',
};
const DEPENDENCY_STATUS: Record<StrataDependency['status'], LozengeAppearance> = {
  open: 'default', at_risk: 'moved', blocked: 'removed', resolved: 'success', cancelled: 'default',
};
const SOURCE_LABEL: Record<StrataProjectCard['source_system'], string> = {
  jira: 'Jira', manual: 'Manual', upload: 'Upload', api: 'API',
};

// ── Presentation helpers (display-only; no business math) ────────────────────
const sarCompact = (v: number | null | undefined): string =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en', { style: 'currency', currency: 'SAR', notation: 'compact', maximumFractionDigits: 1 }).format(v);

const fmtDate = (d: string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const sentence = (s: string): string => {
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Normalize a DB-calculated progress value (fraction or percent) to 0..1 for display. */
const asFraction = (v: number | null | undefined): number | null =>
  v == null ? null : Math.max(0, Math.min(1, v > 1 ? v / 100 : v));

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

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4,
  background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)', fontSize: 11, fontWeight: 600,
};
const captionStyle: React.CSSProperties = { fontSize: 12, color: 'var(--ds-text-subtlest)' };

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
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      data-testid={`strata-initiative-card-${initiative.slug ?? initiative.id}`}
      style={{
        background: selected ? 'var(--ds-background-selected)' : 'var(--ds-surface-raised)',
        border: `1px solid ${selected ? 'var(--ds-border-focused)' : 'var(--ds-border)'}`,
        borderRadius: 8, padding: 12, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ fontSize: 13, color: 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' }}>
          {initiative.name}
        </strong>
        <Lozenge appearance={INITIATIVE_STATUS[initiative.status] ?? 'default'}>
          {sentence(initiative.status)}
        </Lozenge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={chipStyle}>{sentence(initiative.stage)}</span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>{sarCompact(initiative.budget_envelope)}</span>
      </div>
      {initiative.value_hypothesis ? (
        <p
          style={{
            margin: 0, fontSize: 12, color: 'var(--ds-text-subtlest)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}
        >
          {initiative.value_hypothesis}
        </p>
      ) : null}
    </div>
  );
}

// ── Milestones subtable (mounted only when a project is expanded) ────────────
function MilestonesSubtable({ projectCardId }: { projectCardId: string }) {
  const milestonesQ = useMilestones(projectCardId);
  if (milestonesQ.isLoading) return <div style={{ padding: 8 }}><Spinner size="small" /></div>;
  if (milestonesQ.isError) {
    return <p style={{ ...captionStyle, color: 'var(--ds-text-danger)' }}>Failed to load milestones.</p>;
  }
  const milestones = milestonesQ.data ?? [];
  if (milestones.length === 0) {
    return <p style={captionStyle}>No milestones recorded for this project card.</p>;
  }
  const cols = 'minmax(160px, 2fr) 110px 110px 110px 80px 60px';
  const headerCell: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest)',
  };
  const cell: React.CSSProperties = { fontSize: 12, color: 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' };
  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }} data-testid={`strata-milestones-${projectCardId}`}>
      <div style={{ minWidth: 640 }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, padding: '4px 0', borderBottom: '1px solid var(--ds-border)' }}>
          <span style={headerCell}>Milestone</span>
          <span style={headerCell}>Baseline end</span>
          <span style={headerCell}>Forecast / actual</span>
          <span style={headerCell}>Status</span>
          <span style={headerCell}>Progress</span>
          <span style={headerCell}>Weight</span>
        </div>
        {milestones.map((m) => {
          const frac = asFraction(m.progress);
          return (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ds-border)', alignItems: 'center' }}>
              <span style={cell}>{m.name}</span>
              <span style={cell}>{fmtDate(m.baseline_end)}</span>
              <span style={cell}>{m.actual_date ? fmtDate(m.actual_date) : fmtDate(m.forecast_date)}</span>
              <span><Lozenge appearance={MILESTONE_STATUS[m.status] ?? 'default'}>{sentence(m.status)}</Lozenge></span>
              <span style={cell}>{frac == null ? '—' : `${Math.round(frac * 100)}%`}</span>
              <span style={cell}>{m.weight ?? '—'}</span>
            </div>
          );
        })}
      </div>
      <p style={{ ...captionStyle, marginTop: 8 }}>
        {milestones.length} milestone{milestones.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}

// ── Project card (source-agnostic showcase) ──────────────────────────────────
function ProjectCardItem({ card, mappingConfidence }: {
  card: StrataProjectCard;
  mappingConfidence: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
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
      style={{ border: '1px solid var(--ds-border)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13, color: 'var(--ds-text)', overflowWrap: 'anywhere' }}>{card.name}</strong>
          <span style={chipStyle}>
            {SOURCE_LABEL[card.source_system] ?? card.source_system}
            {card.source_key ? ` · ${card.source_key}` : ''}
          </span>
        </div>
        <StrataBandLozenge bandKey={card.execution_health} />
      </div>
      <span style={captionStyle}>
        {mappingConfidence != null ? `${(mappingConfidence * 100).toFixed(0)}% mapping confidence` : '—'}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {frac == null ? (
            <div style={{ height: 6, borderRadius: 3, background: 'var(--ds-background-neutral)' }} />
          ) : (
            <ProgressBar value={frac} aria-label={`Execution progress ${Math.round(frac * 100)}%`} />
          )}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', flexShrink: 0 }}>
          {frac == null ? '—' : `${Math.round(frac * 100)}%`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={captionStyle}>Baseline end {fmtDate(card.baseline_end)}</span>
        <span style={captionStyle}>Forecast end {fmtDate(card.forecast_end)}</span>
        {forecastDelta != null && forecastDelta > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-warning)' }}>
            Forecast +{forecastDelta} day{forecastDelta === 1 ? '' : 's'}
          </span>
        ) : null}
        {synced ? <span style={captionStyle}>Synced {synced}</span> : null}
      </div>
      <div>
        <Button appearance="subtle" spacing="compact" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide milestones' : 'Show milestones'}
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

  const linkedElements = selected ? initiativeElements.filter((r) => r.initiative_id === selected.id) : [];
  const linkedKpis = selected ? initiativeKpis.filter((r) => r.initiative_id === selected.id) : [];
  const linkedProjects: StrataInitiativeProject[] = selected
    ? initiativeProjects.filter((r) => r.initiative_id === selected.id)
    : [];

  const resolvePartyName = (type: StrataDependency['requesting_type'] | StrataDependency['serving_type'], id: string | null): string | null => {
    if (!id) return null;
    if (type === 'initiative') return initiativeById.get(id)?.name ?? null;
    if (type === 'project_card') return cardById.get(id)?.name ?? null;
    return null;
  };

  const depCols = 'minmax(140px, 1.5fr) minmax(140px, 1.5fr) 110px 110px 110px 70px 90px minmax(160px, 2fr)';
  const depHeader: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest)',
  };
  const depCell: React.CSSProperties = { fontSize: 12, color: 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' };

  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>Execution</h1>
      <StrataConfigContextBar />

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
              {initiatives.map((initiative) => (
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
                  <StrataPanel title="Strategy linkage" testId="strata-strategy-linkage">
                    {linkedElements.length === 0 && linkedKpis.length === 0 ? (
                      <EmptyState
                        size="compact"
                        header="Not linked to strategy yet"
                        description="Link this initiative to strategy elements and KPIs to trace contribution."
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <div style={{ ...depHeader, marginBottom: 8 }}>Linked elements</div>
                          {linkedElements.length === 0 ? (
                            <span style={captionStyle}>—</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {linkedElements.map((row) => {
                                const el = elementById.get(row.element_id);
                                const w = row.contribution_weight ?? row.weight ?? null;
                                return (
                                  <span key={`${row.initiative_id}-${row.element_id}`} style={chipStyle}>
                                    <span style={{ color: 'var(--ds-text)' }}>{el?.name ?? '—'}</span>
                                    {w != null ? <span>· {(w <= 1 ? w * 100 : w).toFixed(0)}%</span> : null}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ ...depHeader, marginBottom: 8 }}>Linked KPIs</div>
                          {linkedKpis.length === 0 ? (
                            <span style={captionStyle}>—</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {linkedKpis.map((row) => {
                                const kpi = kpiById.get(row.kpi_id);
                                if (!kpi) return <span key={row.kpi_id} style={chipStyle}>—</span>;
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

                  <StrataPanel title="Project cards" testId="strata-project-cards">
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
                            <ProjectCardItem key={link.id} card={card} mappingConfidence={link.mapping_confidence} />
                          );
                        })}
                      </div>
                    )}
                  </StrataPanel>
                </>
              )}
            </div>
          </div>

          {/* Dependencies — full width */}
          <div style={{ marginTop: 16 }}>
            <StrataPanel title="Dependencies" testId="strata-dependencies">
              {dependenciesQ.isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
              ) : dependenciesQ.isError ? (
                <SectionMessage appearance="error" title="Could not load dependencies">
                  <p>{(dependenciesQ.error as Error | null)?.message ?? 'Unknown error'}</p>
                </SectionMessage>
              ) : dependencies.length === 0 ? (
                <EmptyState size="compact" header="No dependencies" description="Cross-initiative and external dependencies appear here." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 960 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: depCols, gap: 8, padding: '4px 0', borderBottom: '1px solid var(--ds-border)' }}>
                      <span style={depHeader}>Requesting</span>
                      <span style={depHeader}>Serving</span>
                      <span style={depHeader}>Type</span>
                      <span style={depHeader}>Due</span>
                      <span style={depHeader}>Status</span>
                      <span style={depHeader}>SLA</span>
                      <span style={depHeader}>Blocker</span>
                      <span style={depHeader}>Impact</span>
                    </div>
                    {dependencies.map((dep) => {
                      const requesting = resolvePartyName(dep.requesting_type, dep.requesting_id);
                      const serving = resolvePartyName(dep.serving_type, dep.serving_id) ?? dep.serving_label;
                      return (
                        <div key={dep.id} style={{ display: 'grid', gridTemplateColumns: depCols, gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ds-border)', alignItems: 'center' }}>
                          <span style={depCell}>{requesting ?? '—'}</span>
                          <span style={depCell}>{serving ?? '—'}</span>
                          <span style={depCell}>{sentence(dep.dependency_type)}</span>
                          <span style={depCell}>{fmtDate(dep.due_date)}</span>
                          <span><Lozenge appearance={DEPENDENCY_STATUS[dep.status] ?? 'default'}>{sentence(dep.status)}</Lozenge></span>
                          <span style={depCell}>{dep.sla_days != null ? `${dep.sla_days}d` : '—'}</span>
                          <span>{dep.is_blocker ? <Lozenge appearance="removed" isBold>BLOCKER</Lozenge> : <span style={depCell}>—</span>}</span>
                          <span style={depCell}>{dep.impact ?? '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </StrataPanel>
          </div>
        </>
      )}
    </PageContainer>
  );
}
