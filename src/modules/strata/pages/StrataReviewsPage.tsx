/**
 * STRATA Reviews — Snapshot / Decision cockpit
 * (routes /strata/reviews and /strata/reviews/:snapshotKey) — CAT-STRATA-20260705-001.
 *
 * Left rail: locked snapshots (governed, immutable evidence base).
 * Right: frozen evidence, decisions + actions taken on that snapshot,
 * board packs, and the snapshot audit trail.
 *
 * Everything shown from a snapshot is the frozen payload — nothing is
 * recalculated in the UI. ADS tokens only; zero-assumption rendering
 * ('—' when unknown).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Lozenge, SectionMessage } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  useStrataContext,
  useSnapshots,
  useSnapshotItems,
  useDecisions,
  useActions,
  useBoardPacks,
  useStrataAudit,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataConfigContextBar,
  StrataPanel,
  StrataDataStateLozenge,
  StrataBandLozenge,
} from '@/modules/strata/components/shared';
import type { StrataAction, StrataDecision, StrataSnapshot } from '@/modules/strata/types';

const T = {
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  border: 'var(--ds-border)',
  neutral: 'var(--ds-background-neutral)',
  selected: 'var(--ds-background-selected)',
  raised: 'var(--ds-surface-raised)',
  sunken: 'var(--ds-surface-sunken)',
};

/** strata_snapshot_items row (domain returns untyped rows; payload is the frozen record). */
interface SnapshotItemRow {
  id: string;
  snapshot_id: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
}

/** strata_audit_events row (subset rendered here). */
interface AuditEventRow {
  id: string;
  action: string | null;
  actor_id?: string | null;
  created_at: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

const ACTION_LOZENGE: Record<StrataAction['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  open: 'default',
  in_progress: 'inprogress',
  done: 'success',
  cancelled: 'removed',
};

const DECISION_LOZENGE: Record<StrataDecision['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  open: 'inprogress',
  decided: 'success',
  closed: 'default',
};

const PACK_LOZENGE: Record<string, React.ComponentProps<typeof Lozenge>['appearance']> = {
  pending: 'default',
  generating: 'inprogress',
  ready: 'success',
  failed: 'removed',
};

export default function StrataReviewsPage() {
  const navigate = useNavigate();
  const { snapshotKey } = useParams<{ snapshotKey?: string }>();
  const { periods } = useStrataContext();

  const snapshotsQ = useSnapshots();
  const snapshots = snapshotsQ.data ?? [];
  const selected: StrataSnapshot | null = useMemo(
    () => snapshots.find((s) => s.snapshot_key === snapshotKey) ?? snapshots[0] ?? null,
    [snapshots, snapshotKey],
  );

  const itemsQ = useSnapshotItems(selected?.id);
  const items = (itemsQ.data ?? []) as SnapshotItemRow[];
  const decisionsQ = useDecisions();
  const actionsQ = useActions();
  const boardPacksQ = useBoardPacks(selected?.id);
  const auditQ = useStrataAudit('strata_snapshots');

  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);

  // Decisions taken on this snapshot; fall back to all decisions if none match.
  const decisions = useMemo(() => {
    const all = decisionsQ.data ?? [];
    if (!selected) return all;
    const matched = all.filter((d) => d.snapshot_id === selected.id);
    return matched.length > 0 ? matched : all;
  }, [decisionsQ.data, selected]);

  const actionsByDecision = useMemo(() => {
    const m = new Map<string, StrataAction[]>();
    (actionsQ.data ?? []).forEach((a) => {
      if (!a.decision_id) return;
      m.set(a.decision_id, [...(m.get(a.decision_id) ?? []), a]);
    });
    return m;
  }, [actionsQ.data]);

  const evidenceGroups = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.entity_type, (m.get(i.entity_type) ?? 0) + 1));
    return [...m.entries()];
  }, [items]);
  const evidenceSample = items.slice(0, 8);

  const auditEvents = ((auditQ.data ?? []) as AuditEventRow[]).slice(0, 10);

  const periodName = (periodId: string | null): string =>
    periods.find((p) => p.id === periodId)?.name ?? '—';

  const configCount = selected?.config_versions ? Object.keys(selected.config_versions).length : 0;
  const runCount = selected?.data_run_ids?.length ?? 0;

  const loadError = [snapshotsQ, itemsQ, decisionsQ, actionsQ, boardPacksQ, auditQ]
    .map((q) => q.error)
    .find(Boolean) as Error | undefined;

  return (
    <PageContainer variant="wide">
      <style>{`
        .strata-reviews-grid { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }
        @media (max-width: 1024px) { .strata-reviews-grid { grid-template-columns: 1fr; } }
      `}</style>

      <h1 style={{ fontSize: 24, fontWeight: 600, color: T.text, margin: '0 0 8px' }}>
        Reviews &amp; decisions
      </h1>
      <StrataConfigContextBar state={selected?.status ?? null} />

      {loadError ? (
        <SectionMessage appearance="error" title="Could not load review data">
          <p>{loadError.message}</p>
        </SectionMessage>
      ) : snapshotsQ.isLoading ? (
        <div className="strata-reviews-grid">
          <div aria-hidden style={{ height: 320, borderRadius: 8, background: T.neutral }} />
          <div aria-hidden style={{ height: 320, borderRadius: 8, background: T.neutral }} />
        </div>
      ) : snapshots.length === 0 ? (
        <EmptyState
          size="compact"
          header="No snapshots yet"
          description="Lock a period snapshot to open its review cockpit — frozen evidence, decisions and board packs will appear here."
          testId="strata-reviews-empty"
        />
      ) : (
        <div className="strata-reviews-grid" data-testid="strata-reviews-split">
          {/* ── Snapshot rail ─────────────────────────────────────────────── */}
          <div
            style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8, padding: 8, boxShadow: 'var(--ds-shadow-raised)' }}
            data-testid="strata-reviews-rail"
          >
            {snapshots.map((s) => {
              const isSelected = s.id === selected?.id;
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(Routes.strata.review(s.snapshot_key))}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(Routes.strata.review(s.snapshot_key)); } }}
                  data-testid={`strata-reviews-rail-${s.snapshot_key}`}
                  style={{
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                    background: isSelected ? T.selected : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle, flexShrink: 0 }}>{s.snapshot_key}</span>
                    <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                      <StrataDataStateLozenge state={s.status} />
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 12, color: T.subtlest }}>
                    {periodName(s.period_id)} · locked {fmtDate(s.locked_at)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Detail ────────────────────────────────────────────────────── */}
          {selected ? (
            <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>{selected.name}</h2>
                  <StrataDataStateLozenge state={selected.status} />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: T.subtle }}>
                  {configCount} frozen config record{configCount === 1 ? '' : 's'} · {runCount} data run{runCount === 1 ? '' : 's'} · {periodName(selected.period_id)}
                </p>
              </div>

              <StrataPanel title="Frozen evidence" testId="strata-reviews-evidence">
                {items.length === 0 ? (
                  <EmptyState size="compact" header="No frozen items" description="This snapshot carries no frozen evidence records." />
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {evidenceGroups.map(([entityType, count]) => (
                        <span
                          key={entityType}
                          style={{
                            fontSize: 12, fontWeight: 500, color: T.subtle,
                            background: T.neutral, borderRadius: 4, padding: '4px 8px',
                          }}
                        >
                          {entityType.replace(/_/g, ' ')} · {count}
                        </span>
                      ))}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(140px, 1fr) 100px 110px', gap: '0 12px', minWidth: 480 }}>
                        {['Entity type', 'Metric', 'Value', 'Band'].map((h) => (
                          <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.subtlest, padding: '4px 0', borderBottom: `2px solid ${T.border}` }}>
                            {h}
                          </span>
                        ))}
                        {evidenceSample.map((item) => {
                          const metricKey = typeof item.payload?.metric_key === 'string' ? item.payload.metric_key : null;
                          const rawValue = item.payload?.value;
                          const statusKey = typeof item.payload?.status_key === 'string' ? item.payload.status_key : null;
                          return (
                            <React.Fragment key={item.id}>
                              <span style={{ fontSize: 13, color: T.text, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                                {item.entity_type.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontSize: 13, color: T.subtle, padding: '8px 0', borderBottom: `1px solid ${T.border}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {metricKey ?? '—'}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: T.text, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                                {typeof rawValue === 'number' || typeof rawValue === 'string' ? String(rawValue) : '—'}
                              </span>
                              <span style={{ padding: '4px 0', borderBottom: `1px solid ${T.border}` }}>
                                <StrataBandLozenge bandKey={statusKey} />
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </StrataPanel>

              <StrataPanel title="Decisions" testId="strata-reviews-decisions">
                {decisions.length === 0 ? (
                  <EmptyState size="compact" header="No decisions" description="No decisions have been recorded against this snapshot." />
                ) : (
                  decisions.map((d) => {
                    const expanded = expandedDecisionId === d.id;
                    const decisionActions = actionsByDecision.get(d.id) ?? [];
                    return (
                      <div key={d.id} style={{ borderBottom: `1px solid ${T.border}` }} data-testid={`strata-reviews-decision-${d.decision_key}`}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedDecisionId(expanded ? null : d.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDecisionId(expanded ? null : d.id); } }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', cursor: 'pointer', minWidth: 0 }}
                        >
                          <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle, flexShrink: 0 }}>{d.decision_key}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.title}
                          </span>
                          <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>{fmtDate(d.decided_at)}</span>
                          <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>
                            {d.evidence_refs?.length ?? 0} evidence ref{(d.evidence_refs?.length ?? 0) === 1 ? '' : 's'}
                          </span>
                          <Lozenge appearance={DECISION_LOZENGE[d.status] ?? 'default'}>{d.status}</Lozenge>
                        </div>
                        {expanded ? (
                          <div style={{ padding: '0 4px 12px 24px' }}>
                            <p style={{ margin: '0 0 8px', fontSize: 13, color: T.subtle }}>
                              {d.description ?? '—'}
                            </p>
                            {decisionActions.length === 0 ? (
                              <p style={{ margin: 0, fontSize: 12, color: T.subtlest }}>No actions recorded.</p>
                            ) : (
                              decisionActions.map((a) => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', minWidth: 0 }} data-testid={`strata-reviews-action-${a.action_key}`}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle, flexShrink: 0 }}>{a.action_key}</span>
                                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {a.title}
                                  </span>
                                  <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>Owner —</span>
                                  <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>{fmtDate(a.due_date)}</span>
                                  <Lozenge appearance={ACTION_LOZENGE[a.status] ?? 'default'}>{a.status.replace(/_/g, ' ')}</Lozenge>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </StrataPanel>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <StrataPanel title="Board packs" testId="strata-reviews-board-packs">
                  {(boardPacksQ.data ?? []).length === 0 ? (
                    <EmptyState size="compact" header="No board packs" description="Generated board packs for this snapshot appear here." />
                  ) : (
                    (boardPacksQ.data ?? []).map((bp) => (
                      <div key={bp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: `1px solid ${T.border}` }} data-testid={`strata-reviews-pack-${bp.id}`}>
                        <Lozenge appearance="default" isBold>{bp.format.toUpperCase()}</Lozenge>
                        <Lozenge appearance={PACK_LOZENGE[bp.status] ?? 'default'}>{bp.status}</Lozenge>
                        <span style={{ fontSize: 12, color: T.subtlest, flex: 1 }}>{fmtDateTime(bp.generated_at)}</span>
                        <Button
                          appearance="default"
                          spacing="compact"
                          isDisabled={!(bp.status === 'ready' && bp.storage_path)}
                        >
                          Download
                        </Button>
                      </div>
                    ))
                  )}
                </StrataPanel>

                <StrataPanel title="Audit trail" testId="strata-reviews-audit">
                  {auditEvents.length === 0 ? (
                    <EmptyState size="compact" header="No audit events" description="Snapshot audit events appear here." />
                  ) : (
                    auditEvents.map((ev) => (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: `1px solid ${T.border}`, minWidth: 0 }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.action ?? '—'}
                        </span>
                        <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>—</span>
                        <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>{fmtDateTime(ev.created_at)}</span>
                      </div>
                    ))
                  )}
                </StrataPanel>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
