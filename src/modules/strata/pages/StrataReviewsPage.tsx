/**
 * STRATA Reviews — Snapshot / Decision cockpit
 * (routes /strata/reviews and /strata/reviews/:snapshotKey) — CAT-STRATA-20260705-001.
 *
 * Left rail: locked snapshots (governed, immutable evidence base).
 * Right: frozen evidence, decisions + actions taken on that snapshot,
 * board packs, and the snapshot audit trail.
 *
 * Governance rituals live here:
 *   - Lock snapshot (strata_lock_snapshot RPC) — named, cycle+period scoped.
 *   - Close period  (strata_close_period RPC) — attestation guard surfaces
 *     in-modal; override requires a written reason. NEVER silent.
 *
 * Everything shown from a snapshot is the frozen payload — nothing is
 * recalculated in the UI. ADS tokens only; zero-assumption rendering
 * ('—' when unknown).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, CatalystTag, Checkbox, EmptyState, Heading,
  Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Textfield, Tooltip,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import {
  CalendarClock, ChevronDown, ChevronRight, Database, FileBarChart, GitBranch, Lock,
} from '@/lib/atlaskit-icons';
import { governanceApi } from '@/modules/strata/domain';
import {
  useStrataContext,
  useSnapshots,
  useSnapshotItems,
  useDecisions,
  useActions,
  useBoardPacks,
  useProfileNames,
  useStrataAudit,
  useInvalidateStrata,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataPageShell,
  StrataPanel,
  StrataDataStateLozenge,
  StrataBandLozenge,
  T,
} from '@/modules/strata/components/shared';
import { fmtDate, fmtDateTime, fmtUnit, labelize } from '@/modules/strata/components/format';
import type { StrataAction, StrataDecision, StrataPeriod, StrataSnapshot } from '@/modules/strata/types';

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

const ACTION_LOZENGE: Record<StrataAction['status'], LozengeAppearance> = {
  open: 'default',
  in_progress: 'inprogress',
  done: 'success',
  cancelled: 'removed',
};

const DECISION_LOZENGE: Record<StrataDecision['status'], LozengeAppearance> = {
  open: 'inprogress',
  decided: 'success',
  closed: 'default',
};

const PACK_LOZENGE: Record<string, LozengeAppearance> = {
  pending: 'default',
  generating: 'inprogress',
  ready: 'success',
  failed: 'removed',
};

const CLOSE_STATUS_LOZENGE: Record<StrataPeriod['close_status'], { label: string; appearance: LozengeAppearance }> = {
  open: { label: 'Open', appearance: 'inprogress' },
  pending_close: { label: 'Pending close', appearance: 'moved' },
  closed: { label: 'Closed', appearance: 'success' },
};

const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };

/** Small icon-anchored fact chip for the snapshot header row. */
function FactChip({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, height: 28, padding: '0 12px',
      borderRadius: 6, border: `1px solid ${T.border}`, background: T.raised,
      fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap',
    }}>
      <span aria-hidden style={{ display: 'inline-flex', color: T.subtlest }}>{icon}</span>
      <strong style={{ color: T.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
      {label}
    </span>
  );
}

function SnapshotRailItem({ snapshot, isSelected, periodLabel, onSelect }: {
  snapshot: StrataSnapshot;
  isSelected: boolean;
  periodLabel: string;
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
      data-testid={`strata-reviews-rail-${snapshot.snapshot_key}`}
      style={{
        padding: '8px 12px', cursor: 'pointer',
        background: isSelected ? T.selected : hover ? T.sunken : 'transparent',
        borderLeft: isSelected ? '2px solid var(--ds-border-selected)' : '2px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, flexShrink: 0 }}>
          {snapshot.snapshot_key}
        </span>
        <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
          <StrataDataStateLozenge state={snapshot.status} />
        </span>
      </div>
      <div style={{
        fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, margin: '4px 0',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {snapshot.name}
      </div>
      <div style={captionStyle}>
        {periodLabel} · Locked {fmtDate(snapshot.locked_at)}
      </div>
    </div>
  );
}

// ── Lock snapshot modal (governance ritual — errors surface HERE, never silent) ──
function LockSnapshotModal({ open, onClose, cycleId, periodId, periodName }: {
  open: boolean;
  onClose: () => void;
  cycleId: string;
  periodId: string;
  periodName: string;
}) {
  const navigate = useNavigate();
  const invalidate = useInvalidateStrata();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  React.useEffect(() => {
    if (open) { setName(''); setError(null); setBusy(false); }
  }, [open]);
  if (!open) return null;

  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      // RPC freezes the period's latest calculated values; returns the snapshot uuid.
      const snapId = await governanceApi.lockSnapshot(name.trim(), cycleId, periodId) as unknown as string | null;
      invalidate();
      // Resolve the display key for the new snapshot (route-first canon: no UUID in URL).
      const fresh = await governanceApi.snapshots();
      const created = fresh.find((s) => s.id === snapId);
      onClose();
      if (created) navigate(Routes.strata.review(created.snapshot_key));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={busy ? () => {} : onClose} width="small" testId="strata-reviews-lock-modal">
      <ModalHeader><ModalTitle>Lock snapshot</ModalTitle></ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
          Freezes the latest calculated values for <strong style={{ color: T.text }}>{periodName}</strong> into
          an immutable, evidence-linked snapshot. Requires the strategy office role.
        </p>
        <Textfield
          placeholder="Snapshot name (required)"
          value={name}
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          aria-label="Snapshot name"
          testId="strata-reviews-lock-name"
        />
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Lock rejected">
              <p>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Cancel</Button>
        <Button
          appearance="primary"
          onClick={confirm}
          isDisabled={busy || name.trim().length === 0}
          testId="strata-reviews-lock-confirm"
        >
          {busy ? 'Locking…' : 'Lock snapshot'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Close period modal (attestation guard renders in-modal, override needs reason) ──
function ClosePeriodModal({ open, onClose, period }: {
  open: boolean;
  onClose: () => void;
  period: StrataPeriod;
}) {
  const invalidate = useInvalidateStrata();
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  React.useEffect(() => {
    if (open) { setOverride(false); setReason(''); setError(null); setBusy(false); }
  }, [open]);
  if (!open) return null;

  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      // Guard errors (pending attestations / open validation errors) throw and render below.
      await governanceApi.closePeriod(period.id, override, override ? reason.trim() : undefined);
      invalidate();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={busy ? () => {} : onClose} width="small" testId="strata-reviews-close-modal">
      <ModalHeader><ModalTitle>Close period</ModalTitle></ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
          Closes <strong style={{ color: T.text }}>{period.name}</strong>. Blocked while attestations are
          pending or validation errors are open — an override must state its reason and is audited.
        </p>
        <Checkbox
          label="Override the close guard"
          isChecked={override}
          onChange={(e) => setOverride(e.target.checked)}
          testId="strata-reviews-close-override"
        />
        {override ? (
          <div style={{ marginTop: 8 }}>
            <Textfield
              placeholder="Override reason (required)"
              value={reason}
              onChange={(e) => setReason((e.target as HTMLInputElement).value)}
              aria-label="Override reason"
              testId="strata-reviews-close-reason"
            />
          </div>
        ) : null}
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Close rejected">
              <p>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Cancel</Button>
        <Button
          appearance="primary"
          onClick={confirm}
          isDisabled={busy || (override && reason.trim().length === 0)}
          testId="strata-reviews-close-confirm"
        >
          {busy ? 'Closing…' : 'Close period'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function StrataReviewsPage() {
  const navigate = useNavigate();
  const { snapshotKey } = useParams<{ snapshotKey?: string }>();
  const { periods, activeCycle, activePeriod } = useStrataContext();

  const snapshotsQ = useSnapshots();
  const snapshots = useMemo(() => snapshotsQ.data ?? [], [snapshotsQ.data]);
  const selected: StrataSnapshot | null = useMemo(
    () => snapshots.find((s) => s.snapshot_key === snapshotKey) ?? snapshots[0] ?? null,
    [snapshots, snapshotKey],
  );

  const itemsQ = useSnapshotItems(selected?.id);
  const items = useMemo(() => (itemsQ.data ?? []) as SnapshotItemRow[], [itemsQ.data]);
  const decisionsQ = useDecisions();
  const actionsQ = useActions();
  const boardPacksQ = useBoardPacks(selected?.id);
  const auditQ = useStrataAudit('strata_snapshots');
  const profilesQ = useProfileNames();

  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const canLock = !!activeCycle && !!activePeriod;

  const profileName = (id: string | null | undefined): string | null =>
    id ? profilesQ.data?.get(id)?.name ?? null : null;

  // Decisions taken on THIS snapshot only — never imply unrelated membership.
  const allDecisions = useMemo(() => decisionsQ.data ?? [], [decisionsQ.data]);
  const snapshotDecisions = useMemo(
    () => (selected ? allDecisions.filter((d) => d.snapshot_id === selected.id) : []),
    [allDecisions, selected],
  );

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

  // Rail failure blanks the page; detail-column failures stay in the detail column.
  const railError = snapshotsQ.error as Error | null;
  const detailError = [itemsQ, decisionsQ, actionsQ, boardPacksQ, auditQ]
    .map((q) => q.error)
    .find(Boolean) as Error | undefined;

  const evidenceColumns: Column<SnapshotItemRow>[] = [
    {
      id: 'entity-type', label: 'Entity type', width: 18,
      cell: ({ row }) => <CatalystTag text={labelize(row.entity_type)} />,
    },
    {
      id: 'metric', label: 'Metric', flex: true,
      cell: ({ row }) => {
        const payloadName = typeof row.payload?.name === 'string' ? row.payload.name : null;
        const metricKey = typeof row.payload?.metric_key === 'string' ? row.payload.metric_key : null;
        const display = payloadName ?? (metricKey ? labelize(metricKey) : null);
        return display
          ? <span style={{ ...bodyStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{display}</span>
          : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'value', label: 'Value', width: 14, align: 'end',
      cell: ({ row }) => {
        const rawValue = row.payload?.value;
        const unit = typeof row.payload?.unit === 'string' ? row.payload.unit : null;
        return (typeof rawValue === 'number' || typeof rawValue === 'string')
          ? <span style={{ ...bodyStyle, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtUnit(rawValue, unit)}</span>
          : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'band', label: 'Band', width: 12,
      cell: ({ row }) => {
        const statusKey = typeof row.payload?.status_key === 'string' ? row.payload.status_key : null;
        return statusKey ? <StrataBandLozenge bandKey={statusKey} /> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
  ];

  const renderDecision = (d: StrataDecision) => {
    const expanded = expandedDecisionId === d.id;
    const decisionActions = actionsByDecision.get(d.id) ?? [];
    const evidenceCount = d.evidence_refs?.length ?? 0;
    return (
      <div key={d.id} style={{ borderBottom: `1px solid ${T.border}` }} data-testid={`strata-reviews-decision-${d.decision_key}`}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => setExpandedDecisionId(expanded ? null : d.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDecisionId(expanded ? null : d.id); } }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', cursor: 'pointer', minWidth: 0 }}
        >
          <span style={{ color: T.subtlest, flexShrink: 0, display: 'inline-flex' }} aria-hidden>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, flexShrink: 0 }}>{d.decision_key}</span>
          <span style={{ flex: 1, minWidth: 0, ...bodyStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.title}
          </span>
          {d.decided_at ? (
            <span style={{ ...captionStyle, flexShrink: 0 }}>Decided {fmtDate(d.decided_at)}</span>
          ) : d.due_date ? (
            <span style={{ ...captionStyle, flexShrink: 0 }}>Due {fmtDate(d.due_date)}</span>
          ) : null}
          {evidenceCount > 0 ? (
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.brandText, flexShrink: 0 }}>
              {evidenceCount} evidence ref{evidenceCount === 1 ? '' : 's'}
            </span>
          ) : null}
          <StatusLozenge status={d.status} label={labelize(d.status)} appearance={DECISION_LOZENGE[d.status] ?? 'default'} />
        </div>
        {expanded ? (
          <div style={{ padding: '0 4px 12px 24px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
              {d.description ?? '—'}
            </p>
            {evidenceCount > 0 ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {(d.evidence_refs ?? []).map((ref, i) => (
                  <CatalystTag key={`${ref.entity_type}-${i}`} text={ref.note ? `${labelize(ref.entity_type)} · ${ref.note}` : labelize(ref.entity_type)} />
                ))}
              </div>
            ) : null}
            {decisionActions.length === 0 ? (
              <p style={{ margin: 0, ...captionStyle }}>No actions recorded.</p>
            ) : (
              decisionActions.map((a) => {
                const ownerName = profileName(a.owner_id);
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', minWidth: 0 }} data-testid={`strata-reviews-action-${a.action_key}`}>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, flexShrink: 0 }}>{a.action_key}</span>
                    <span style={{ flex: 1, minWidth: 0, ...bodyStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                    </span>
                    {ownerName ? <span style={{ ...captionStyle, flexShrink: 0 }}>{ownerName}</span> : null}
                    {a.due_date ? <span style={{ ...captionStyle, flexShrink: 0 }}>Due {fmtDate(a.due_date)}</span> : null}
                    <StatusLozenge status={a.status} label={labelize(a.status)} appearance={ACTION_LOZENGE[a.status] ?? 'default'} />
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const skeletonBlock = (height: number): React.ReactNode => (
    <div aria-hidden style={{ height, borderRadius: 8, background: T.neutral }} />
  );

  const lockButton = (
    <Tooltip content={canLock ? `Freezes calculated values for ${activePeriod?.name}` : 'Select a cycle and period first'}>
      <Button
        appearance="primary"
        spacing="compact"
        onClick={() => setLockOpen(true)}
        isDisabled={!canLock}
        testId="strata-reviews-lock-button"
      >
        Lock snapshot
      </Button>
    </Tooltip>
  );

  const isDetail = !!snapshotKey;
  const closeCfg = activePeriod ? CLOSE_STATUS_LOZENGE[activePeriod.close_status] : null;

  return (
    <StrataPageShell
      trail={isDetail ? [{ text: 'Reviews & decisions', href: Routes.strata.reviews() }, { text: snapshotKey! }] : undefined}
      docTitle={isDetail ? snapshotKey : 'Reviews & decisions'}
      state={selected?.status ?? null}
      testId="strata-reviews-shell"
    >
      {railError ? (
        <SectionMessage appearance="error" title="Could not load review data">
          <p>{railError.message}</p>
        </SectionMessage>
      ) : snapshotsQ.isLoading ? (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 1 320px', minWidth: 280 }}>{skeletonBlock(320)}</div>
          <div style={{ flex: '1 1 480px', minWidth: 0, display: 'grid', gap: 16 }}>
            {skeletonBlock(48)}
            {skeletonBlock(180)}
            {skeletonBlock(160)}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* ── Period governance (index only): close ritual lives with reviews ── */}
          {!isDetail && activePeriod ? (
            <StrataPanel
              title="Period governance"
              icon={<CalendarClock size={16} />}
              testId="strata-reviews-period-governance"
              actions={
                <Button
                  appearance="default"
                  spacing="compact"
                  onClick={() => setCloseOpen(true)}
                  isDisabled={activePeriod.close_status === 'closed'}
                  testId="strata-reviews-close-button"
                >
                  Close period
                </Button>
              }
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ ...bodyStyle, fontWeight: 600 }}>{activePeriod.name}</span>
                {closeCfg ? <StatusLozenge status={activePeriod.close_status} label={closeCfg.label} appearance={closeCfg.appearance} /> : null}
                <span style={captionStyle}>
                  {activePeriod.close_status === 'closed'
                    ? 'This period is closed — its numbers are final.'
                    : 'Closing is blocked while attestations are pending; overrides are audited.'}
                </span>
              </div>
            </StrataPanel>
          ) : null}

          {snapshots.length === 0 ? (
            <div>
              <EmptyState
                size="compact"
                header="No snapshots yet"
                description="Lock a period snapshot to open its review cockpit — frozen evidence, decisions and board packs will appear here."
                testId="strata-reviews-empty"
              />
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                {lockButton}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }} data-testid="strata-reviews-split">
              {/* ── Snapshot rail ─────────────────────────────────────────────── */}
              <div style={{ flex: '0 1 320px', minWidth: 280 }} data-testid="strata-reviews-rail">
                <StrataPanel
                  title="Snapshots"
                  icon={<Lock size={16} />}
                  count={snapshots.length}
                  noPadding
                  actions={lockButton}
                >
                  <div style={{ padding: '4px 0' }}>
                    {snapshots.map((s) => (
                      <SnapshotRailItem
                        key={s.id}
                        snapshot={s}
                        isSelected={s.id === selected?.id}
                        periodLabel={periodName(s.period_id)}
                        onSelect={() => navigate(Routes.strata.review(s.snapshot_key))}
                      />
                    ))}
                  </div>
                </StrataPanel>
              </div>

              {/* ── Detail ────────────────────────────────────────────────────── */}
              {selected ? (
                <div style={{ flex: '1 1 480px', display: 'grid', gap: 16, minWidth: 0 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Heading as="h2" size="medium">{selected.name}</Heading>
                      <StrataDataStateLozenge state={selected.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <FactChip icon={<Database size={12} />} value={configCount} label={`frozen record${configCount === 1 ? '' : 's'}`} />
                      <FactChip icon={<GitBranch size={12} />} value={runCount} label={`data run${runCount === 1 ? '' : 's'}`} />
                      <FactChip icon={<CalendarClock size={12} />} value={periodName(selected.period_id)} label="" />
                    </div>
                  </div>

                  {detailError ? (
                    <SectionMessage appearance="error" title="Some review data could not be loaded">
                      <p>{detailError.message}</p>
                    </SectionMessage>
                  ) : null}

                  <StrataPanel title="Frozen evidence" icon={<Database size={16} />} count={items.length} noPadding testId="strata-reviews-evidence">
                    {items.length === 0 ? (
                      <div style={{ padding: 16 }}>
                        <EmptyState size="compact" header="No frozen items" description="This snapshot carries no frozen evidence records." />
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '12px 16px 4px' }}>
                          {evidenceGroups.map(([entityType, count]) => (
                            <CatalystTag key={entityType} text={`${labelize(entityType)} · ${count}`} />
                          ))}
                        </div>
                        <JiraTable<SnapshotItemRow>
                          columns={evidenceColumns}
                          data={evidenceSample}
                          getRowId={(i) => i.id}
                          showRowCount={false}
                          ariaLabel={`Frozen evidence for ${selected.name}`}
                        />
                        {items.length > evidenceSample.length ? (
                          <p style={{ ...captionStyle, margin: 0, padding: '8px 16px 12px' }}>
                            Showing {evidenceSample.length} of {items.length} frozen records
                          </p>
                        ) : null}
                      </>
                    )}
                  </StrataPanel>

                  <StrataPanel title="Decisions" icon={<FileBarChart size={16} />} count={snapshotDecisions.length} testId="strata-reviews-decisions">
                    {snapshotDecisions.length === 0 ? (
                      <EmptyState size="compact" header="No decisions recorded against this snapshot" description="Decisions made on this snapshot's evidence will appear here." />
                    ) : (
                      snapshotDecisions.map(renderDecision)
                    )}
                  </StrataPanel>

                  {/* Unlinked decisions — clearly labeled, never implied as snapshot membership */}
                  {snapshotDecisions.length === 0 && allDecisions.length > 0 ? (
                    <StrataPanel title="All decisions" icon={<FileBarChart size={16} />} count={allDecisions.length} testId="strata-reviews-all-decisions">
                      <p style={{ ...captionStyle, margin: '0 0 8px' }}>
                        Recorded across all snapshots — not linked to {selected.snapshot_key}.
                      </p>
                      {allDecisions.map(renderDecision)}
                    </StrataPanel>
                  ) : null}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <StrataPanel title="Board packs" icon={<FileBarChart size={16} />} count={(boardPacksQ.data ?? []).length} testId="strata-reviews-board-packs">
                      {(boardPacksQ.data ?? []).length === 0 ? (
                        <EmptyState size="compact" header="No board packs" description="Generated board packs for this snapshot appear here." />
                      ) : (
                        (boardPacksQ.data ?? []).map((bp) => {
                          const isReady = bp.status === 'ready';
                          const isUrl = typeof bp.storage_path === 'string' && /^https?:\/\//.test(bp.storage_path);
                          return (
                            <div key={bp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: `1px solid ${T.border}` }} data-testid={`strata-reviews-pack-${bp.id}`}>
                              <CatalystTag text={bp.format.toUpperCase()} />
                              <StatusLozenge status={bp.status} label={labelize(bp.status)} appearance={PACK_LOZENGE[bp.status] ?? 'default'} />
                              <span style={{ ...captionStyle, flex: 1 }}>{fmtDateTime(bp.generated_at)}</span>
                              {isReady && isUrl ? (
                                <Button appearance="default" spacing="compact" onClick={() => window.open(bp.storage_path as string, '_blank', 'noopener')}>
                                  Download
                                </Button>
                              ) : isReady ? (
                                <Tooltip content="Download ships with board-pack generation">
                                  <CatalystTag text="Ready" color="green" />
                                </Tooltip>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </StrataPanel>

                    <StrataPanel title="Audit trail" icon={<CalendarClock size={16} />} count={auditEvents.length} testId="strata-reviews-audit">
                      {auditEvents.length === 0 ? (
                        <EmptyState size="compact" header="No audit events" description="Snapshot audit events appear here." />
                      ) : (
                        auditEvents.map((ev) => {
                          const actorName = profileName(ev.actor_id);
                          return (
                            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: `1px solid ${T.border}`, minWidth: 0 }}>
                              <span style={{ flex: 1, minWidth: 0, ...bodyStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ev.action ? labelize(ev.action) : '—'}
                              </span>
                              {actorName ? <span style={{ ...captionStyle, flexShrink: 0 }}>{actorName}</span> : null}
                              <span style={{ ...captionStyle, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(ev.created_at)}</span>
                            </div>
                          );
                        })
                      )}
                    </StrataPanel>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {canLock ? (
        <LockSnapshotModal
          open={lockOpen}
          onClose={() => setLockOpen(false)}
          cycleId={activeCycle!.id}
          periodId={activePeriod!.id}
          periodName={activePeriod!.name}
        />
      ) : null}
      {activePeriod ? (
        <ClosePeriodModal open={closeOpen} onClose={() => setCloseOpen(false)} period={activePeriod} />
      ) : null}
    </StrataPageShell>
  );
}
