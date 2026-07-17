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
import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, CatalystTag, Checkbox, EmptyState, Heading, Lozenge,
  Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import {
  CalendarClock, Database, FileBarChart, GitBranch, Lock,
} from '@/lib/atlaskit-icons';
import { governanceApi, kpiApi } from '@/modules/strata/domain';
import {
  useStrataContext,
  useSnapshots,
  useSnapshotItems,
  useDecisions,
  useActions,
  useBoardPacks,
  useAllBoardPacks,
  useKpis,
  useProfileNames,
  useStrataAudit,
  useStrataRoles,
  useInvalidateStrata,
  useNeedsAttention,
} from '@/modules/strata/hooks/useStrata';
import { generateBoardPackPdf, generateBoardPackPptx } from '@/modules/strata/lib/boardPack';
import type { BoardPackData } from '@/modules/strata/lib/boardPack';
import {
  StrataPageShell,
  StrataPanel,
  StrataSnapshotBand,
  StrataDataStateLozenge,
  StrataBandLozenge,
  StrataStatStrip,
  StrataLifecycleStepper,
  type StrataStat,
  type StrataLifecycleStep,
  type StrataStepState,
  T,
} from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import { fmtDate, fmtDateTime, fmtUnit, labelize } from '@/modules/strata/components/format';
import type {
  StrataAction, StrataDecision, StrataPeriod, StrataReview, StrataReviewReadiness, StrataSnapshot,
} from '@/modules/strata/types';

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

/** Derived review-registry row (slice 4B) — one per current (non-superseded) snapshot. */
interface ReviewRow {
  snapshot: StrataSnapshot;
  stageLabel: string;
  stageStatus: string;
  stageAppearance: LozengeAppearance;
  steps: StrataLifecycleStep[];
  decisionsSummary: string;
  followupsText: string;
  followupsOverdue: number;
}

/** Snapshot-registry row (slice 4B) — every snapshot, superseded ones struck-through. */
interface SnapshotRegistryRow {
  snapshot: StrataSnapshot;
  superseded: boolean;
  supersedesKeys: string[];
  basisOf: string;
}

/** Live achievement shape from strata_calc_kpi_achievement (client cast — compare-with-live, 4C-3). */
interface KpiAchievementPayload {
  achievement: number | null;
  actual: number | null;
  target: number | null;
  status_key: string | null;
}

/** One frozen-vs-live comparison row (4C-3). */
interface CompareRow {
  kpiId: string;
  name: string;
  frozenValue: number | null;
  frozenBand: string | null;
  liveValue: number | null;
  liveBand: string | null;
  restated: boolean;
  hasLive: boolean;
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

/** Roles allowed to author decisions/actions — UI affordance only; RPCs enforce for real. */
/** executive_viewer is read-only by definition ("CEO/CXO consumption; no data edits") — W2 20260710140000. */
const DECISION_AUTHOR_ROLES: readonly string[] = ['strategy_office', 'vmo_validator', 'strata_admin'];
/** Mirrors storage RLS on strata-board-packs (20260710130000): strategy_office, with strata_is_admin bypass. */
const PACK_PERSIST_ROLES: readonly string[] = ['strategy_office', 'strata_admin'];

const DECISION_TYPE_OPTIONS: Array<{ value: StrataDecision['decision_type']; label: string }> = [
  { value: 'governance', label: 'Governance' },
  { value: 'gate', label: 'Gate' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'action_only', label: 'Action only' },
];

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

/** Editorial numbered section header (Command Room SRC-M7) — the board pack
 *  reads like a document: "01 — Key metrics", "02 — Frozen evidence", … */
function PackSection({ n, title }: { n: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
      <span aria-hidden style={{
        fontFamily: T.fontDisplay, fontSize: 26, fontWeight: 700, color: T.subtlest,
        lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
      }}>
        {n}
      </span>
      <Heading as="h3" size="small">{title}</Heading>
    </div>
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
    <Modal isOpen onClose={busy ? () => {} : onClose} width="small" testId="strata-reviews-lock-modal">
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
    <Modal isOpen onClose={busy ? () => {} : onClose} width="small" testId="strata-reviews-close-modal">
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

// ── R2/E1 · scheduled reviews (persisted entity `strata_reviews`, D-6) ────────
/**
 * The persisted review entity is AUTHORITATIVE going forward. The derived
 * snapshot-keyed "Review registry" below it is retained deliberately as
 * compatibility / verification support (migration 20260717130000 says so in
 * as many words) — it is no longer the system of record.
 *
 * Three rules from the migration are load-bearing here and are not negotiable:
 *  1. `origin='migrated'` rows were RECONSTRUCTED from a locked snapshot by the D-6
 *     backfill. Their chair / agenda / scheduled_for / participants are NULL meaning
 *     NOT RECORDED — never "none". Rendering them as a bare '—' would imply the meeting
 *     had no chair, which is a lie about a meeting that really happened.
 *  2. `is_ready` requires a LOCKED SNAPSHOT ONLY. `pack_attached` is reported separately
 *     and is deliberately NOT part of readiness — a review may legitimately convene on
 *     locked numbers before its pack is built. The two are never ANDed here: that would
 *     invent a gate the database explicitly rejected.
 *  3. `blocking_reasons` is rendered IN FULL, so the surface states WHY rather than
 *     showing a bare status. A row can be Ready AND still carry "no board pack attached".
 */

/** Mirrors strata_has_role(ARRAY['strategy_office']) — which admits strata_admin via strata_is_admin. */
const REVIEW_GOVERN_ROLES: readonly string[] = ['strategy_office', 'strata_admin'];

const REVIEW_STATUS_LOZENGE: Record<StrataReview['status'], LozengeAppearance> = {
  scheduled: 'default',
  in_progress: 'inprogress',
  closed: 'success',
  cancelled: 'removed',
};

/**
 * Exactly the transitions strata_update_review permits. The RPC has no transition graph:
 * its ONLY refusal is on a review whose CURRENT status is already 'closed' ("a closed review
 * records a meeting that already happened and cannot be edited"). So closed is terminal here
 * and every other status may still move. Closing additionally requires a LOCKED snapshot —
 * that check is left to the server and its refusal is surfaced verbatim, because the readiness
 * view already names the gap and a client copy of the rule could disagree with it.
 */
const REVIEW_NEXT_STATUS: Record<StrataReview['status'], Array<{ to: StrataReview['status']; label: string; danger?: boolean }>> = {
  scheduled: [
    { to: 'in_progress', label: 'Start' },
    { to: 'closed', label: 'Close' },
    { to: 'cancelled', label: 'Cancel', danger: true },
  ],
  in_progress: [
    { to: 'closed', label: 'Close' },
    { to: 'cancelled', label: 'Cancel', danger: true },
  ],
  cancelled: [{ to: 'scheduled', label: 'Reinstate' }],
  closed: [],
};

/** D-6: absent, not empty. Never rendered as '—', which would read as "there was none". */
const NOT_RECORDED = 'Not recorded';
export const REVIEW_MIGRATED_NOTICE =
  'Reconstructed from a locked snapshot by the migration — its chair, participants, agenda and meeting date were never recorded. Absent, not empty.';
const REVIEW_READINESS_RULE =
  'Ready means the snapshot is locked. A board pack is reported separately and does not gate convening.';
const CADENCE_HELPER =
  'Optional — left unset, the server applies its own default (departmental → monthly, executive → quarterly).';

/**
 * Form values → `governanceApi.scheduleReview` input. Pure, and exported, so the cadence rule is
 * provable: when the user chose no cadence the key is OMITTED ENTIRELY rather than filled with a
 * client-side default. Sending 'monthly' here would turn the server's documented default into a
 * value the user never picked, and the row would then claim a cadence as a recorded choice.
 * cycle_id is DERIVED from the chosen period (a fact on the period row), never assumed.
 */
export function scheduleInputFromForm(
  values: Record<string, unknown>,
  periods: StrataPeriod[],
): Parameters<typeof governanceApi.scheduleReview>[0] {
  const str = (k: string): string | undefined => {
    const v = values[k];
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
  };
  const periodId = str('period_id');
  const period = periodId ? periods.find((p) => p.id === periodId) ?? null : null;
  const cadence = str('cadence') as StrataReview['cadence'] | undefined;
  return {
    name: str('name') ?? '',
    reviewType: values.review_type as StrataReview['review_type'],
    periodId: periodId ?? null,
    cycleId: period?.cycle_id ?? null,
    scheduledFor: str('scheduled_for') ?? null,
    chairId: str('chair_id') ?? null,
    // Present ONLY when genuinely chosen — see the docblock.
    ...(cadence ? { cadence } : {}),
  };
}

/**
 * Exported so the governed lifecycle can be tested directly, mirroring SourcesRegistry (R3).
 * Rendering the whole page in a test drags in the STRATA shell and would prove the shell.
 */
export function ScheduledReviewsSection() {
  const { periods } = useStrataContext();
  const rolesQ = useStrataRoles();
  const profilesQ = useProfileNames();
  const snapshotsQ = useSnapshots();
  const invalidate = useInvalidateStrata();
  const reviewsQ = useQuery({
    queryKey: ['strata', 'reviews'],
    queryFn: () => governanceApi.reviews(),
    staleTime: 30_000,
  });
  const readinessQ = useQuery({
    queryKey: ['strata', 'review-readiness'],
    queryFn: () => governanceApi.reviewReadiness(),
    staleTime: 30_000,
  });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pending, setPending] = useState<{ review: StrataReview; to: StrataReview['status'] } | null>(null);
  const [attachTo, setAttachTo] = useState<StrataReview | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = reviewsQ.data ?? [];
  // The RPC's own gate, mirrored — this only avoids offering a verb the server would refuse.
  const canGovern = (rolesQ.data ?? []).some((r) => REVIEW_GOVERN_ROLES.includes(r));

  const readinessById = useMemo(() => {
    const m = new Map<string, StrataReviewReadiness>();
    (readinessQ.data ?? []).forEach((r) => m.set(r.review_id, r));
    return m;
  }, [readinessQ.data]);

  const chairName = (id: string | null): string | null => (id ? profilesQ.data?.get(id)?.name ?? null : null);

  const applyStatus = async () => {
    if (!pending) return;
    setBusy(true); setError(null);
    try {
      await governanceApi.updateReview(pending.review.id, {
        status: pending.to,
        note: note.trim() || null,
      });
      invalidate();
      setPending(null); setNote('');
    } catch (e) {
      // Verbatim: the RPC already states its own refusal ("a review cannot close on a snapshot
      // that is not locked (it is superseded) — …"). Re-wording it would lose the reason.
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<StrataReview>[] = [
    {
      id: 'review', label: 'Review', flex: true,
      cell: ({ row }) => {
        const migrated = row.origin === 'migrated';
        return (
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-050)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-075)', flexWrap: 'wrap' }}>
              <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.name}</span>
              {/* A migrated row must be visually distinguishable — its meeting details are
                  reconstructions, not records. */}
              {migrated ? (
                <span data-testid={`strata-review-migrated-${row.id}`}>
                  <Lozenge appearance="moved">Migrated · details not recorded</Lozenge>
                </span>
              ) : null}
            </span>
            <span style={{ ...captionStyle, fontVariantNumeric: 'tabular-nums' }}>{row.review_key}</span>
            {migrated ? (
              <span style={captionStyle} data-testid={`strata-review-migrated-note-${row.id}`}>
                {REVIEW_MIGRATED_NOTICE}
              </span>
            ) : null}
            {/* The server's own note on the row, rendered verbatim — on migrated rows it states
                which facts are assumptions of the migration rather than recorded facts. */}
            {row.note ? (
              <span style={captionStyle} data-testid={`strata-review-note-${row.id}`}>{row.note}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'type', label: 'Type · cadence', width: 14,
      cell: ({ row }) => (
        <span style={captionStyle}>{labelize(row.review_type)} · {labelize(row.cadence)}</span>
      ),
    },
    {
      id: 'scheduled', label: 'Scheduled', width: 14,
      cell: ({ row }) => {
        if (row.scheduled_for) {
          return <span style={{ ...captionStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(row.scheduled_for)}</span>;
        }
        // NULL on a migrated row is "never captured", not "unscheduled" — say which.
        return (
          <span style={captionStyle} data-testid={`strata-review-scheduled-${row.id}`}>
            {row.origin === 'migrated' ? NOT_RECORDED : '—'}
          </span>
        );
      },
    },
    {
      id: 'chair', label: 'Chair', width: 14,
      cell: ({ row }) => {
        const name = chairName(row.chair_id);
        if (name) return <span style={captionStyle}>{name}</span>;
        return (
          <span style={captionStyle} data-testid={`strata-review-chair-${row.id}`}>
            {row.origin === 'migrated' ? NOT_RECORDED : '—'}
          </span>
        );
      },
    },
    {
      id: 'readiness', label: 'Readiness', width: 26,
      cell: ({ row }) => {
        const rd = readinessById.get(row.id) ?? null;
        if (!rd) return <span style={captionStyle}>—</span>;
        return (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-050)', minWidth: 0 }}
            data-testid={`strata-review-readiness-${row.id}`}
          >
            <span style={{ display: 'flex', gap: 'var(--ds-space-075)', flexWrap: 'wrap' }}>
              {/* is_ready is the view's own verdict — snapshot-locked ONLY. Never ANDed with the pack. */}
              <Lozenge appearance={rd.is_ready ? 'success' : 'moved'}>
                {rd.is_ready ? 'Ready to convene' : 'Not ready'}
              </Lozenge>
              {/* Reported alongside, never folded into readiness. */}
              <Lozenge appearance={rd.pack_attached ? 'new' : 'default'}>
                {rd.pack_attached ? 'Pack attached' : 'No pack attached'}
              </Lozenge>
            </span>
            <span style={captionStyle}>{REVIEW_READINESS_RULE}</span>
            {rd.blocking_reasons.length > 0 ? (
              <ul
                style={{ margin: 0, paddingLeft: 'var(--ds-space-250)', ...captionStyle }}
                data-testid={`strata-review-blockers-${row.id}`}
              >
                {/* Every reason the view returned — including "no board pack attached" on a row
                    that is nonetheless Ready. Naming them is the point; counting them is not. */}
                {rd.blocking_reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'status', label: 'Status', width: 22,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-075)', minWidth: 0 }}>
          <span>
            <StatusLozenge
              status={row.status}
              label={labelize(row.status)}
              appearance={REVIEW_STATUS_LOZENGE[row.status] ?? 'default'}
            />
          </span>
          {!canGovern ? null : row.status === 'closed' ? (
            // Terminal by rule. Saying so beats rendering buttons the server will refuse.
            <span style={captionStyle} data-testid={`strata-review-closed-${row.id}`}>
              Closed — this records a meeting that already happened and cannot be edited.
            </span>
          ) : (
            <span style={{ display: 'inline-flex', gap: 'var(--ds-space-075)', flexWrap: 'wrap' }}>
              {/* Without this, "no snapshot attached" would be a blocker the surface states but
                  gives no way to resolve. Re-pointing is permitted while the review is not closed —
                  nothing has been recorded against it yet. */}
              <Button
                spacing="compact"
                appearance="subtle"
                isDisabled={busy}
                testId={`strata-review-attach-${row.id}`}
                onClick={() => { setError(null); setAttachTo(row); }}
              >
                {row.snapshot_id ? 'Change snapshot' : 'Attach snapshot'}
              </Button>
              {(REVIEW_NEXT_STATUS[row.status] ?? []).map((n) => (
                <Button
                  key={n.to}
                  spacing="compact"
                  appearance={n.danger ? 'danger' : 'default'}
                  isDisabled={busy}
                  testId={`strata-review-${n.to}-${row.id}`}
                  onClick={() => { setNote(''); setError(null); setPending({ review: row, to: n.to }); }}
                >
                  {n.label}
                </Button>
              ))}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <StrataPanel
      title="Scheduled reviews"
      icon={<CalendarClock size={16} />}
      count={rows.length}
      noPadding
      testId="strata-reviews-scheduled"
      actions={canGovern ? (
        <Button
          appearance="primary"
          spacing="compact"
          onClick={() => { setError(null); setScheduleOpen(true); }}
          testId="strata-review-schedule"
        >
          Schedule review
        </Button>
      ) : <Lozenge appearance="new">Read-only for your role</Lozenge>}
    >
      <p style={{ ...captionStyle, margin: 0, padding: 'var(--ds-space-150) var(--ds-space-200) 0' }}>
        The reviews the organisation has actually scheduled. A review is scheduled before its snapshot
        is locked — that is the point of scheduling, and it is what makes readiness a real question.
        Monthly departmental and quarterly executive are the server&apos;s defaults, not laws: a body
        that meets off-cadence is recorded as it meets.
      </p>
      {error ? (
        <div style={{ padding: 'var(--ds-space-150) var(--ds-space-200) 0' }}>
          <SectionMessage appearance="error" title="Review update rejected by the database">
            <p style={{ whiteSpace: 'pre-wrap' }} data-testid="strata-review-error">{error}</p>
          </SectionMessage>
        </div>
      ) : null}
      {reviewsQ.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--ds-space-300)' }}>
          <Spinner size="medium" />
        </div>
      ) : reviewsQ.isError ? (
        <div style={{ padding: 'var(--ds-space-200)' }}>
          <SectionMessage appearance="error" title="Failed to load scheduled reviews">
            <p>{reviewsQ.error instanceof Error ? reviewsQ.error.message : 'Unknown error'}</p>
          </SectionMessage>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 'var(--ds-space-200)' }}>
          <EmptyState
            size="compact"
            header="No reviews scheduled"
            description="Scheduled departmental and executive reviews appear here, with their readiness against the locked snapshot they will convene on."
          />
        </div>
      ) : (
        <JiraTable<StrataReview>
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          showRowCount={false}
          ariaLabel="Scheduled reviews"
        />
      )}

      {/* Status transition. Nothing is pre-gated beyond the RPC's own terminal rule: closing
          without a locked snapshot is REFUSED BY THE SERVER, and that refusal renders verbatim
          above rather than being predicted here. */}
      <Modal isOpen={!!pending} onClose={busy ? () => {} : () => setPending(null)} width="small">
        <ModalHeader>
          <ModalTitle>{pending ? `${labelize(pending.to)} · ${pending.review.name}` : ''}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 var(--ds-space-150)', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            {pending?.to === 'closed'
              ? 'A review can only close on a locked snapshot — closing on live numbers would record a decision against figures that can still move. The database enforces this and its refusal is shown verbatim. Closing is final: a closed review cannot be edited afterwards.'
              : pending?.to === 'cancelled'
                ? 'Cancelling records that this review will not convene. It stays on the register.'
                : 'This changes the review’s status on the register.'}
          </p>
          <Textfield
            value={note}
            onChange={(e) => setNote((e.target as HTMLInputElement).value)}
            placeholder="Note (optional) — recorded in the audit trail"
            aria-label="Note"
            testId="strata-review-status-note"
          />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setPending(null)} isDisabled={busy}>Cancel</Button>
          <Button
            appearance={pending?.to === 'cancelled' ? 'danger' : 'primary'}
            isDisabled={busy}
            testId="strata-review-status-confirm"
            onClick={() => void applyStatus()}
          >
            {pending ? labelize(pending.to) : ''}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Attach the snapshot a review will convene on. EVERY snapshot is offered, each labelled
          with its own status — not just locked ones: a review may legitimately attach a snapshot
          before it is locked, and readiness then states "snapshot is not locked" rather than the
          UI pretending the choice does not exist. The one-review-per-snapshot constraint is the
          database's to enforce; its rejection surfaces verbatim. */}
      {canGovern && attachTo ? (
        <StrataFormModal
          open
          onClose={() => setAttachTo(null)}
          title={`Attach snapshot · ${attachTo.name}`}
          description="A review convenes on one snapshot. Readiness requires that snapshot to be locked — a board pack is separate and does not gate convening."
          fields={[{
            key: 'snapshot_id', label: 'Snapshot', kind: 'select', required: true,
            options: (snapshotsQ.data ?? []).map((s) => ({
              value: s.id,
              label: `${s.snapshot_key} · ${s.name} · ${labelize(s.status)}`,
            })),
          }]}
          initial={attachTo.snapshot_id ? { snapshot_id: attachTo.snapshot_id } : undefined}
          submitLabel="Attach snapshot"
          onSubmit={async (v) => {
            await governanceApi.updateReview(attachTo.id, { snapshotId: v.snapshot_id as string });
            invalidate();
          }}
          testId="strata-review-attach-modal"
        />
      ) : null}

      {/* Schedule — the server assigns REV-xxxx. Cadence is deliberately optional and NOT
          pre-filled: the default is stated as a hint, because a pre-filled default would be
          recorded as a choice the user never made. */}
      {canGovern ? (
        <StrataFormModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          title="Schedule review"
          description="The review key is assigned by the server. A review is scheduled before its snapshot is locked — attach the snapshot when it exists."
          fields={[
            { key: 'name', label: 'Name', kind: 'text', required: true },
            {
              key: 'review_type', label: 'Type', kind: 'select', required: true,
              options: [
                { value: 'departmental', label: 'Departmental' },
                { value: 'executive', label: 'Executive' },
              ],
            },
            {
              key: 'cadence', label: 'Cadence', kind: 'select',
              helper: CADENCE_HELPER,
              placeholder: 'Use the server default for this type',
              options: [
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'ad_hoc', label: 'Ad hoc' },
              ],
            },
            {
              key: 'period_id', label: 'Period', kind: 'select',
              helper: 'Optional — the cycle is taken from the period.',
              options: periods.map((p) => ({ value: p.id, label: p.name })),
            },
            { key: 'scheduled_for', label: 'Scheduled for', kind: 'date' },
            { key: 'chair_id', label: 'Chair', kind: 'user' },
          ]}
          submitLabel="Schedule review"
          onSubmit={async (v) => {
            await governanceApi.scheduleReview(scheduleInputFromForm(v as Record<string, unknown>, periods));
            invalidate();
          }}
          testId="strata-review-schedule-modal"
        />
      ) : null}
    </StrataPanel>
  );
}

export default function StrataReviewsPage() {
  const navigate = useNavigate();
  const { snapshotKey } = useParams<{ snapshotKey?: string }>();
  const { cycles, periods, activeCycle, activePeriod } = useStrataContext();

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
  const kpisQ = useKpis(); // KPI names for the compare-with-live panel (4C-3)
  // Period-close readiness (CLOSEOUT W5): advisory only — reuses the period-scoped
  // needs-attention feed; the DB still enforces the real attestation guard on close.
  const readinessQ = useNeedsAttention(activePeriod?.id);
  const readinessChecks = useMemo(() => {
    const rows = readinessQ.data ?? [];
    const n = (type: string) => rows.filter((r) => r.item_type === type).length;
    const openDecisions = ((decisionsQ.data ?? []) as StrataDecision[]).filter((d) => d.status === 'open').length;
    return [
      { key: 'missing_actual', label: 'KPI actuals submitted', pending: n('missing_actual') },
      { key: 'pending_attestation', label: 'Actuals attested', pending: n('pending_attestation') },
      { key: 'pending_benefit_validation', label: 'Benefit values validated', pending: n('pending_benefit_validation') },
      { key: 'overdue_action', label: 'Actions cleared', pending: n('overdue_action') },
      { key: 'overdue_gate', label: 'Gates decided', pending: n('overdue_gate') },
      { key: 'open_decisions', label: 'Decisions resolved', pending: openDecisions },
    ];
  }, [readinessQ.data, decisionsQ.data]);
  const readinessBlockers = readinessChecks.reduce((sum, c) => sum + c.pending, 0);

  // Board-pack "01 — Key metrics" (SRC-M7): oversized stat cards from the
  // snapshot's own frozen payloads — value + governed band exactly as frozen,
  // never recomputed. Zero-assumption: section renders only when values exist.
  const keyMetrics = useMemo((): StrataStat[] => {
    return items
      .filter((i) => typeof i.payload?.value === 'number' || typeof i.payload?.value === 'string')
      .slice(0, 4)
      .map((i) => ({
        key: i.id,
        label: typeof i.payload?.entity_name === 'string' ? i.payload.entity_name : labelize(i.entity_type),
        value: fmtUnit(
          i.payload!.value as number | string,
          typeof i.payload?.unit === 'string' ? i.payload.unit : null,
        ),
        caption: typeof i.payload?.name === 'string'
          ? i.payload.name
          : typeof i.payload?.metric_key === 'string' ? labelize(i.payload.metric_key) : undefined,
        bandKey: typeof i.payload?.status_key === 'string' ? i.payload.status_key : null,
      }));
  }, [items]);
  /** Editorial section number — shifts by one when "01 — Key metrics" renders. */
  const packNo = (position: number): string =>
    String(position + (keyMetrics.length > 0 ? 1 : 0)).padStart(2, '0');

  const [lockOpen, setLockOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  // Compare-with-live fires the live RPC batch only once opened — reset on snapshot switch.
  React.useEffect(() => { setCompareOpen(false); }, [snapshotKey]);

  // ── Decision/action authoring (Lane G) — RPC-only writes, errors verbatim ──
  const [newDecisionOpen, setNewDecisionOpen] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [govError, setGovError] = useState<string | null>(null);
  const [govBusyId, setGovBusyId] = useState<string | null>(null);

  // ── Client-side board-pack generation (Q7: PDF + PPTX; server engine has no channel yet) ──
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const [packBusy, setPackBusy] = useState<'pdf' | 'pptx' | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [packNote, setPackNote] = useState<string | null>(null);
  // Pack messages describe ONE snapshot's generation — never carry them across a switch.
  React.useEffect(() => { setPackError(null); setPackNote(null); }, [snapshotKey]);

  const canLock = !!activeCycle && !!activePeriod;
  const canAuthor = (rolesQ.data ?? []).some((r) => DECISION_AUTHOR_ROLES.includes(r));

  const profileName = (id: string | null | undefined): string | null =>
    id ? profilesQ.data?.get(id)?.name ?? null : null;

  /** Status transitions — server blocks e.g. closing a decision with open actions; error shown verbatim. */
  const transition = async (
    kind: 'decision' | 'action',
    id: string,
    status: StrataDecision['status'] | StrataAction['status'],
  ) => {
    setGovBusyId(id); setGovError(null);
    try {
      if (kind === 'decision') await governanceApi.updateDecision(id, { status: status as StrataDecision['status'] });
      else await governanceApi.updateAction(id, { status: status as StrataAction['status'] });
      invalidate();
    } catch (e) {
      setGovError(e instanceof Error ? e.message : String(e));
    } finally {
      setGovBusyId(null);
    }
  };

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

  // Today (YYYY-MM-DD) — shared by every overdue derivation below. Declared here
  // so the earliest consumer (snapshotActions) can read it without a TDZ.
  const todayISO = new Date().toISOString().slice(0, 10);

  // Actions register (slice 4C-2): this snapshot's actions, each carrying its
  // decision ancestry (born from a decision on THIS snapshot's evidence) + the
  // follow-up ageing footer (closed / overdue).
  const snapshotActions = useMemo(() => {
    const rows = snapshotDecisions.flatMap((d) => (actionsByDecision.get(d.id) ?? []).map((action) => ({ action, decisionKey: d.decision_key })));
    const closed = rows.filter((x) => x.action.status === 'done').length;
    const overdue = rows.filter((x) => (x.action.status === 'open' || x.action.status === 'in_progress') && x.action.due_date != null && x.action.due_date < todayISO).length;
    return { rows, closed, overdue };
  }, [snapshotDecisions, actionsByDecision, todayISO]);

  // ── Index registry derivations (slice 4B, anchor 23) ──────────────────────
  // Reviews are a DERIVED virtual entity (P4-D1): one review == a current
  // (non-superseded) locked snapshot, keyed by snapshot_key — no strata_reviews
  // table. Lifecycle + counts compose over snapshots + decisions + actions +
  // board packs; anything the schema can't back renders an honest gap.
  const allPacksQ = useAllBoardPacks();
  const packsBySnapshot = useMemo(() => {
    const m = new Map<string, number>();
    (allPacksQ.data ?? []).forEach((p) => m.set(p.snapshot_id, (m.get(p.snapshot_id) ?? 0) + 1));
    return m;
  }, [allPacksQ.data]);

  const decisionsBySnapshot = useMemo(() => {
    const m = new Map<string, StrataDecision[]>();
    allDecisions.forEach((d) => {
      if (!d.snapshot_id) return;
      m.set(d.snapshot_id, [...(m.get(d.snapshot_id) ?? []), d]);
    });
    return m;
  }, [allDecisions]);

  const reviewRows = useMemo<ReviewRow[]>(() => {
    return snapshots
      .filter((s) => s.status !== 'superseded')
      .map((s) => {
        const period = periods.find((p) => p.id === s.period_id) ?? null;
        const decs = decisionsBySnapshot.get(s.id) ?? [];
        const recorded = decs.filter((d) => d.status === 'decided' || d.status === 'closed').length;
        const open = decs.filter((d) => d.status === 'open').length;
        const acts = decs.flatMap((d) => actionsByDecision.get(d.id) ?? []);
        const openActs = acts.filter((a) => a.status === 'open' || a.status === 'in_progress');
        const doneActs = acts.filter((a) => a.status === 'done').length;
        const overdue = openActs.filter((a) => a.due_date != null && a.due_date < todayISO).length;

        const decisionsState: StrataStepState = decs.length === 0 ? 'todo' : open > 0 ? 'current' : 'done';
        const actionsState: StrataStepState =
          acts.length === 0 ? 'todo' : overdue > 0 ? 'failed' : openActs.length > 0 ? 'current' : 'done';
        const steps: StrataLifecycleStep[] = [
          { id: 'readiness', label: 'Readiness', state: 'done' },
          { id: 'snapshot', label: 'Snapshot locked', state: s.locked_at ? 'done' : 'todo' },
          { id: 'decisions', label: 'Decisions', state: decisionsState },
          { id: 'actions', label: 'Actions', state: actionsState },
          { id: 'pack', label: 'Board pack', state: (packsBySnapshot.get(s.id) ?? 0) > 0 ? 'done' : 'todo' },
        ];

        const closed = period?.close_status === 'closed';
        return {
          snapshot: s,
          stageLabel: closed ? 'Closed' : 'In progress',
          stageStatus: closed ? 'closed' : 'in_progress',
          stageAppearance: (closed ? 'success' : 'inprogress') as LozengeAppearance,
          steps,
          decisionsSummary: decs.length === 0 ? 'none recorded' : `${recorded} recorded${open > 0 ? ` · ${open} open` : ''}`,
          followupsText: acts.length === 0 ? 'no follow-ups' : `${doneActs} of ${acts.length} closed${overdue > 0 ? ` · ${overdue} overdue` : ''}`,
          followupsOverdue: overdue,
        };
      });
  }, [snapshots, periods, decisionsBySnapshot, actionsByDecision, packsBySnapshot, todayISO]);

  const snapshotRegistryRows = useMemo<SnapshotRegistryRow[]>(() => {
    // Only the reverse pointer (superseded_by_id, on the OLD row) exists — scan
    // for predecessors so the current row can narrate what it supersedes.
    const supersedesMap = new Map<string, string[]>();
    snapshots.forEach((s) => {
      if (s.superseded_by_id) {
        supersedesMap.set(s.superseded_by_id, [...(supersedesMap.get(s.superseded_by_id) ?? []), s.snapshot_key]);
      }
    });
    return snapshots.map((s) => {
      const decs = decisionsBySnapshot.get(s.id) ?? [];
      const decNote = decs.length > 0 ? ` · ${decs.length} decision record${decs.length === 1 ? '' : 's'}` : '';
      return {
        snapshot: s,
        superseded: s.status === 'superseded' || !!s.superseded_by_id,
        supersedesKeys: supersedesMap.get(s.id) ?? [],
        basisOf: `${s.name}${decNote}`,
      };
    });
  }, [snapshots, decisionsBySnapshot]);

  // NOW band — single most-consequential fact + open-cockpit link (anchor 23).
  const nowFact = useMemo(() => {
    if (reviewRows.length === 0) return null;
    const inProgress = reviewRows.find((r) => r.stageLabel !== 'Closed');
    const target = inProgress ?? reviewRows[0];
    const decs = decisionsBySnapshot.get(target.snapshot.id) ?? [];
    const recorded = decs.filter((d) => d.status === 'decided' || d.status === 'closed').length;
    const clauses: string[] = [];
    if (decs.length > 0) clauses.push(`${recorded} of ${decs.length} decision${decs.length === 1 ? '' : 's'} recorded`);
    if (target.followupsOverdue > 0) {
      clauses.push(`${target.followupsOverdue} follow-up${target.followupsOverdue === 1 ? '' : 's'} overdue`);
    }
    const lead = inProgress ? 'is in progress' : 'is the latest review';
    const tail = clauses.length > 0 ? ` — ${clauses.join('; ')}.` : '.';
    return { key: target.snapshot.snapshot_key, sentence: `${target.snapshot.name} ${lead}${tail}` };
  }, [reviewRows, decisionsBySnapshot]);

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

  // ── Cockpit derivations (slice 4C-1, anchor 10) ───────────────────────────
  // Identity-band counts + selected-snapshot lifecycle strip, all derived from
  // the frozen snapshot items + governance data (no new field; zero-assumption).
  const kpiItemCount = useMemo(() => items.filter((i) => i.entity_type === 'kpi').length, [items]);
  const benefitItemCount = useMemo(() => items.filter((i) => i.entity_type === 'benefit').length, [items]);

  const selectedStage = useMemo(() => {
    if (!selected) return null;
    const period = periods.find((p) => p.id === selected.period_id) ?? null;
    const closed = period?.close_status === 'closed';
    return {
      label: closed ? 'Closed' : 'In progress',
      status: closed ? 'closed' : 'in_progress',
      appearance: (closed ? 'success' : 'inprogress') as LozengeAppearance,
    };
  }, [selected, periods]);

  const selectedLifecycle = useMemo<StrataLifecycleStep[]>(() => {
    if (!selected) return [];
    const decs = decisionsBySnapshot.get(selected.id) ?? [];
    const recorded = decs.filter((d) => d.status === 'decided' || d.status === 'closed').length;
    const open = decs.filter((d) => d.status === 'open').length;
    const acts = decs.flatMap((d) => actionsByDecision.get(d.id) ?? []);
    const openActs = acts.filter((a) => a.status === 'open' || a.status === 'in_progress');
    const doneActs = acts.filter((a) => a.status === 'done').length;
    const overdue = openActs.filter((a) => a.due_date != null && a.due_date < todayISO).length;
    const packCount = packsBySnapshot.get(selected.id) ?? 0;

    const decisionsState: StrataStepState = decs.length === 0 ? 'todo' : open > 0 ? 'current' : 'done';
    const actionsState: StrataStepState =
      acts.length === 0 ? 'todo' : overdue > 0 ? 'failed' : openActs.length > 0 ? 'current' : 'done';
    return [
      { id: 'readiness', label: 'Readiness', state: 'done', note: `${kpiItemCount} KPI${kpiItemCount === 1 ? '' : 's'} frozen` },
      { id: 'snapshot', label: 'Snapshot locked', state: selected.locked_at ? 'done' : 'todo', note: selected.locked_at ? fmtDate(selected.locked_at) : undefined },
      { id: 'decisions', label: 'Decisions', state: decisionsState, note: decs.length === 0 ? 'none recorded' : `${recorded} of ${decs.length} recorded` },
      { id: 'actions', label: 'Actions', state: actionsState, note: acts.length === 0 ? 'none assigned' : `${doneActs} of ${acts.length} closed${overdue > 0 ? ` · ${overdue} overdue` : ''}` },
      { id: 'pack', label: 'Board pack', state: packCount > 0 ? 'done' : 'todo', note: packCount > 0 ? `${packCount} generated` : 'not issued' },
    ];
  }, [selected, decisionsBySnapshot, actionsByDecision, packsBySnapshot, kpiItemCount, todayISO]);

  // ── Compare with live (slice 4C-3, P4-D5) ─────────────────────────────────
  // Client diff of each frozen KPI's snapshot value vs its LIVE recalculation
  // (strata_calc_kpi_achievement over the snapshot's OWN period). No RPC/migration.
  // The live batch fires ONLY when the panel is open (enabled gate).
  const kpiNameById = useMemo(() => {
    const m = new Map<string, string>();
    (kpisQ.data ?? []).forEach((k) => m.set(k.id, k.name));
    return m;
  }, [kpisQ.data]);

  const frozenKpis = useMemo(() => {
    const seen = new Map<string, SnapshotItemRow>();
    items.forEach((i) => {
      if (i.entity_type === 'kpi' && i.entity_id && !seen.has(i.entity_id)) seen.set(i.entity_id, i);
    });
    return [...seen.values()];
  }, [items]);

  const liveAchQueries = useQueries({
    queries: frozenKpis.map((i) => ({
      queryKey: ['strata', 'kpi-achievement', i.entity_id, selected?.period_id],
      queryFn: () => kpiApi.achievement(i.entity_id!, selected!.period_id!),
      enabled: compareOpen && !!selected?.period_id,
      staleTime: 30_000,
    })),
  });
  const liveResolvedKey = liveAchQueries.map((q) => (q.data ? 1 : 0)).join('');
  const compareRows = useMemo<CompareRow[]>(() => {
    return frozenKpis.map((i, idx) => {
      const kpiId = i.entity_id!;
      const rawFrozen = i.payload?.value;
      const frozenValue = typeof rawFrozen === 'number' ? rawFrozen : typeof rawFrozen === 'string' ? Number(rawFrozen) : null;
      const frozenBand = typeof i.payload?.status_key === 'string' ? i.payload.status_key : null;
      const live = liveAchQueries[idx]?.data as KpiAchievementPayload | undefined;
      const liveValue = live?.achievement ?? null;
      const liveBand = live?.status_key ?? null;
      const hasLive = live != null && liveValue != null;
      // Restated when the live recalculation drifts from the frozen truth (value > 0.05 or band flip).
      const restated = hasLive && (
        (frozenValue != null && liveValue != null && Math.abs(frozenValue - liveValue) > 0.05) ||
        (frozenBand != null && liveBand != null && frozenBand !== liveBand)
      );
      return {
        kpiId,
        name: kpiNameById.get(kpiId) ?? (typeof i.payload?.entity_name === 'string' ? i.payload.entity_name : kpiId.slice(0, 8)),
        frozenValue, frozenBand, liveValue, liveBand, restated, hasLive,
      };
    });
  }, [frozenKpis, kpiNameById, liveResolvedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const compareLoading = compareOpen && liveAchQueries.some((q) => q.isLoading);
  const restatedRows = compareRows.filter((r) => r.restated);

  /**
   * Build + download the executive pack from the LOADED cockpit data (no refetch,
   * no recalculation — every value is the frozen payload as rendered on screen).
   * If a pending pack row exists for this format AND the user holds strategy_office
   * (the only role RLS lets UPDATE strata_board_packs), reconcile it to 'ready';
   * otherwise leave the row untouched and say so — never fake server generation.
   */
  /** Fetch a short-lived signed URL for a stored pack and open it (bucket is private). */
  const downloadStoredPack = async (_packId: string, storagePath: string) => {
    setPackError(null);
    try {
      const url = await governanceApi.boardPackSignedUrl(storagePath);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setPackError(e instanceof Error ? e.message : String(e));
    }
  };

  const generatePack = async (format: 'pdf' | 'pptx') => {
    if (!selected) return;
    setPackBusy(format); setPackError(null); setPackNote(null);
    try {
      const data: BoardPackData = {
        snapshot: selected,
        cycleName: cycles.find((c) => c.id === selected.cycle_id)?.name ?? null,
        periodName: selected.period_id ? periodName(selected.period_id) : null,
        evidenceGroups: evidenceGroups.map(([entityType, count]): [string, number] => [labelize(entityType), count]),
        runCount,
        evidence: items.map((row) => {
          // Frozen payload carries entity_name for NEW snapshots; older ones lack it — dash then.
          const entityName = typeof row.payload?.entity_name === 'string' ? row.payload.entity_name : null;
          const payloadName = typeof row.payload?.name === 'string' ? row.payload.name : null;
          const metricKey = typeof row.payload?.metric_key === 'string' ? row.payload.metric_key : null;
          const rawValue = row.payload?.value;
          const unit = typeof row.payload?.unit === 'string' ? row.payload.unit : null;
          const statusKey = typeof row.payload?.status_key === 'string' ? row.payload.status_key : null;
          return {
            entityType: labelize(row.entity_type),
            entity: entityName ?? '—',
            metric: payloadName ?? (metricKey ? labelize(metricKey) : '—'),
            value: (typeof rawValue === 'number' || typeof rawValue === 'string') ? fmtUnit(rawValue, unit) : '—',
            band: statusKey ? labelize(statusKey) : '—',
          };
        }),
        decisions: snapshotDecisions.map((d) => ({ decision: d, ownerName: profileName(d.owner_id) })),
        openActions: snapshotDecisions
          .flatMap((d) => actionsByDecision.get(d.id) ?? [])
          .filter((a) => a.status === 'open' || a.status === 'in_progress')
          .map((a) => ({ action: a, ownerName: profileName(a.owner_id) })),
      };
      const artifact = format === 'pdf' ? await generateBoardPackPdf(data) : await generateBoardPackPptx(data);

      // Persist to the shared pack library (private strata-board-packs bucket).
      // DB rule: strata_has_role(['strategy_office']) = strategy_office OR strata_is_admin —
      // the client gate mirrors it exactly; on failure we say so, never fake success.
      const canPersist = (rolesQ.data ?? []).some((r) => PACK_PERSIST_ROLES.includes(r));
      if (!canPersist) {
        setPackNote(`${artifact.filename} downloaded — generated locally from the frozen snapshot. Storing to the shared pack library requires the Strategy Office role.`);
        return;
      }
      const storagePath = `${selected.snapshot_key}/${artifact.filename}`;
      try {
        await governanceApi.uploadBoardPackBinary(storagePath, artifact.blob, artifact.contentType);
        const rows = boardPacksQ.data ?? [];
        const reusable =
          rows.find((bp) => bp.format === format && bp.status === 'pending') ??
          rows.find((bp) => bp.format === format && bp.storage_path === storagePath);
        if (reusable) await governanceApi.markBoardPackStored(reusable.id, storagePath);
        else await governanceApi.createBoardPackRecord(selected.id, format, storagePath);
        invalidate();
        setPackNote(`${artifact.filename} downloaded and stored to the pack library — anyone with STRATA access can retrieve it from this list.`);
      } catch (persistErr) {
        setPackNote(
          `${artifact.filename} downloaded locally, but storing to the pack library failed: ${persistErr instanceof Error ? persistErr.message : String(persistErr)}`,
        );
      }
    } catch (e) {
      setPackError(e instanceof Error ? e.message : String(e));
    } finally {
      setPackBusy(null);
    }
  };

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
      // Frozen payload carries entity_name for NEW snapshots; older snapshots may
      // lack it — render a dash then (never the raw entity_id).
      id: 'entity', label: 'Entity', width: 20,
      cell: ({ row }) => {
        const entityName = typeof row.payload?.entity_name === 'string' ? row.payload.entity_name : null;
        return entityName
          ? <span style={{ ...bodyStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{entityName}</span>
          : <span style={{ color: T.subtlest }}>—</span>;
      },
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

  // ── Review registry (anchor 23): derived reviews, lifecycle-positioned ──────
  const reviewColumns: Column<ReviewRow>[] = [
    {
      id: 'review', label: 'Review', flex: true,
      cell: ({ row }) => (
        <div style={{ minWidth: 0 }}>
          <span style={{ ...bodyStyle, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {row.snapshot.name}
          </span>
          <span style={{ ...captionStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {row.snapshot.locked_at ? fmtDate(row.snapshot.locked_at) : '—'}
          </span>
        </div>
      ),
    },
    {
      id: 'stage', label: 'Stage', width: 15,
      cell: ({ row }) => <StatusLozenge status={row.stageStatus} label={row.stageLabel} appearance={row.stageAppearance} />,
    },
    {
      id: 'lifecycle', label: 'Lifecycle', width: 13,
      cell: ({ row }) => (
        <StrataLifecycleStepper variant="dots" steps={row.steps} ariaLabel={`Lifecycle for ${row.snapshot.name}`} />
      ),
    },
    {
      id: 'snapshot', label: 'Snapshot', width: 15,
      cell: ({ row }) => <span style={{ ...captionStyle, color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>{row.snapshot.snapshot_key}</span>,
    },
    {
      id: 'decisions', label: 'Decisions', width: 15,
      cell: ({ row }) => <span style={captionStyle}>{row.decisionsSummary}</span>,
    },
    {
      id: 'followups', label: 'Follow-ups', width: 15,
      cell: ({ row }) => (
        <span style={{
          ...captionStyle,
          color: row.followupsOverdue > 0 ? 'var(--ds-text-danger)' : T.subtle,
          fontWeight: row.followupsOverdue > 0 ? 600 : 400,
        }}>
          {row.followupsText}
        </span>
      ),
    },
  ];

  // ── Snapshot registry (anchor 23): supersede chains narrated, nothing silently replaced ──
  const snapshotColumns: Column<SnapshotRegistryRow>[] = [
    {
      id: 'snapshot', label: 'Snapshot', width: 20,
      cell: ({ row }) => (
        <span style={{
          ...bodyStyle, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
          textDecoration: row.superseded ? 'line-through' : 'none',
          color: row.superseded ? T.subtlest : T.brandText,
        }}>
          {row.snapshot.snapshot_key}
        </span>
      ),
    },
    {
      id: 'frozen', label: 'Frozen', width: 20,
      cell: ({ row }) => (
        <span style={{ ...captionStyle, fontVariantNumeric: 'tabular-nums', color: row.superseded ? T.subtlest : T.subtle }}>
          {row.snapshot.locked_at ? fmtDateTime(row.snapshot.locked_at) : '—'}
        </span>
      ),
    },
    {
      id: 'basis', label: 'Basis of', flex: true,
      cell: ({ row }) => (
        <span style={{ ...captionStyle, color: row.superseded ? T.subtlest : T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {row.basisOf}
        </span>
      ),
    },
    {
      id: 'supersedes', label: 'Supersedes', width: 22,
      cell: ({ row }) => row.supersedesKeys.length > 0
        ? <span style={captionStyle}>{row.supersedesKeys.join(', ')}</span>
        : <span style={{ color: T.subtlest }}>—</span>,
    },
  ];

  // Decision-register card (anchor 10): status lozenge + title + snapshot-evidence
  // prose + verdict-record band (once recorded) + evidence refs + governed authoring.
  const renderDecision = (d: StrataDecision) => {
    const recorded = d.status === 'decided' || d.status === 'closed';
    const evidenceRefs = d.evidence_refs ?? [];
    return (
      <div key={d.id} style={{ padding: 16, borderBottom: `1px solid ${T.border}` }} data-testid={`strata-reviews-decision-${d.decision_key}`}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <span style={{ flexShrink: 0 }}>
            <StatusLozenge status={d.status} label={labelize(d.status)} appearance={DECISION_LOZENGE[d.status] ?? 'default'} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>{d.decision_key}</span>
              <span style={{ ...bodyStyle, fontWeight: 600 }}>{d.title}</span>
            </div>
            {/* Snapshot evidence that motivates the decision */}
            <p style={{ margin: '4px 0 0', ...captionStyle, color: T.subtle, lineHeight: 1.5 }}>{d.description ?? '—'}</p>
            {/* Verdict record — once recorded, the outcome + who/when + against-SNAP */}
            {recorded ? (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: T.sunken, border: `1px solid ${T.border}`, ...captionStyle, color: T.text, lineHeight: 1.5 }}>
                <strong>{labelize(d.status)}</strong>
                <span style={{ display: 'block', marginTop: 4, color: T.subtlest }}>
                  Recorded by {profileName(d.decided_by) ?? '—'} · {d.decided_at ? fmtDateTime(d.decided_at) : '—'} · against {selected?.snapshot_key ?? '—'}
                </span>
              </div>
            ) : d.due_date ? (
              <p style={{ margin: '4px 0 0', ...captionStyle }}>Due {fmtDate(d.due_date)}</p>
            ) : null}
            {evidenceRefs.length > 0 ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {evidenceRefs.map((ref, i) => (
                  <CatalystTag key={`${ref.entity_type}-${i}`} text={ref.note ? `${labelize(ref.entity_type)} · ${ref.note}` : labelize(ref.entity_type)} />
                ))}
              </div>
            ) : null}
            {canAuthor ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {d.status === 'open' ? (
                  <Button spacing="compact" isDisabled={govBusyId === d.id} onClick={() => void transition('decision', d.id, 'decided')} testId={`strata-reviews-decide-${d.decision_key}`}>
                    Mark decided
                  </Button>
                ) : null}
                {d.status === 'decided' ? (
                  <Tooltip content="Blocked by the server while this decision still has open actions">
                    <Button spacing="compact" isDisabled={govBusyId === d.id} onClick={() => void transition('decision', d.id, 'closed')} testId={`strata-reviews-close-decision-${d.decision_key}`}>
                      Close decision
                    </Button>
                  </Tooltip>
                ) : null}
                <Button spacing="compact" appearance="default" onClick={() => setActionTargetId(d.id)} testId={`strata-reviews-new-action-${d.decision_key}`}>
                  New action
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  // Actions-register row (anchor 10): title + decision ancestry + owner + due tone
  // + governed transitions. Overdue = open/in-progress past its due date.
  const renderActionRow = (a: StrataAction, decisionKey: string) => {
    const overdue = (a.status === 'open' || a.status === 'in_progress') && a.due_date != null && a.due_date < todayISO;
    return (
      <div key={a.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }} data-testid={`strata-reviews-action-${a.action_key}`}>
        <div style={{ ...bodyStyle, fontWeight: 600 }}>{a.title}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4, ...captionStyle, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>from <span style={{ color: T.subtle, fontWeight: 600 }}>{decisionKey}</span></span>
          <span>owner <span style={{ color: T.subtle, fontWeight: 600 }}>{profileName(a.owner_id) ?? '—'}</span></span>
          {a.due_date ? (
            <span style={{ color: overdue ? 'var(--ds-text-danger)' : T.subtle, fontWeight: overdue ? 600 : 400 }}>Due {fmtDate(a.due_date)}</span>
          ) : null}
          <StatusLozenge status={a.status} label={labelize(a.status)} appearance={ACTION_LOZENGE[a.status] ?? 'default'} />
        </div>
        {canAuthor && (a.status === 'open' || a.status === 'in_progress') ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {a.status === 'open' ? (
              <Button spacing="compact" appearance="subtle" isDisabled={govBusyId === a.id} onClick={() => void transition('action', a.id, 'in_progress')} testId={`strata-reviews-start-${a.action_key}`}>Start</Button>
            ) : null}
            {a.status === 'in_progress' ? (
              <Button spacing="compact" appearance="subtle" isDisabled={govBusyId === a.id} onClick={() => void transition('action', a.id, 'done')} testId={`strata-reviews-done-${a.action_key}`}>Done</Button>
            ) : null}
            <Button spacing="compact" appearance="subtle" isDisabled={govBusyId === a.id} onClick={() => void transition('action', a.id, 'cancelled')} testId={`strata-reviews-cancel-${a.action_key}`}>Cancel</Button>
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

  // Period governance (close ritual + readiness) — a working governed feature not
  // in anchor 23; preserved below the registries rather than dropped (no regression).
  const periodGovernancePanel = activePeriod ? (
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
      {activePeriod.close_status !== 'closed' ? (
        <div style={{ marginTop: 'var(--ds-space-200)' }} data-testid="strata-reviews-close-readiness">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--ds-space-100)' }}>
            <span style={{ ...bodyStyle, fontWeight: 600 }}>Close readiness</span>
            <StatusLozenge
              status={readinessBlockers === 0 ? 'ready' : 'attention'}
              label={readinessBlockers === 0 ? 'Ready to close' : `${readinessBlockers} to resolve`}
              appearance={readinessBlockers === 0 ? 'success' : 'moved'}
            />
            <span style={captionStyle}>Advisory — closing is still possible; the database enforces the attestation guard.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--ds-space-100)' }}>
            {readinessChecks.map((c) => (
              <div
                key={c.key}
                data-testid={`strata-reviews-readiness-${c.key}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 'var(--ds-space-100) var(--ds-space-150)', border: `1px solid ${T.border}`, borderRadius: 6 }}
              >
                <span style={bodyStyle}>{c.label}</span>
                <StatusLozenge
                  status={c.pending === 0 ? 'clear' : 'pending'}
                  label={c.pending === 0 ? 'Clear' : String(c.pending)}
                  appearance={c.pending === 0 ? 'success' : 'moved'}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </StrataPanel>
  ) : null;

  // NOW band (anchor 23) — single most-consequential fact + open-cockpit link.
  const nowBand = nowFact ? (
    <div
      data-testid="strata-reviews-now"
      style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)' }}
    >
      <span style={{ ...captionStyle, fontWeight: 700, letterSpacing: '0.04em', color: T.subtlest }}>NOW</span>
      <span style={{ ...bodyStyle, flex: 1, minWidth: 0 }}>{nowFact.sentence}</span>
      <button
        type="button"
        onClick={() => navigate(Routes.strata.review(nowFact.key))}
        style={{ background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit', color: T.brandText, cursor: 'pointer', flexShrink: 0 }}
        data-testid="strata-reviews-now-open"
      >
        Open cockpit →
      </button>
    </div>
  ) : null;

  // Index registries (anchor 23) — review registry + snapshot registry.
  const reviewsIndex = (
    <>
      {nowBand}
      {/* R2/E1: the persisted entity is authoritative. The derived registry below it is kept as
          compatibility / verification support per migration 20260717130000, not as the record. */}
      <ScheduledReviewsSection />
      <StrataPanel
        title="Review registry (derived)"
        icon={<CalendarClock size={16} />}
        count={reviewRows.length}
        noPadding
        testId="strata-reviews-registry"
        actions={<span style={captionStyle}>Lifecycle: readiness · snapshot · decisions · actions · pack</span>}
      >
        <p style={{ ...captionStyle, margin: 0, padding: 'var(--ds-space-150) var(--ds-space-200) 0' }}>
          Derived from locked snapshots, one row per current snapshot. Retained as compatibility and
          verification support alongside the scheduled reviews above, which are the system of record.
        </p>
        {reviewRows.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState size="compact" header="No reviews yet" description="Lock a period snapshot to open its review lifecycle." />
          </div>
        ) : (
          <JiraTable<ReviewRow>
            columns={reviewColumns}
            data={reviewRows}
            getRowId={(r) => r.snapshot.id}
            onRowClick={(r) => navigate(Routes.strata.review(r.snapshot.snapshot_key))}
            showRowCount={false}
            ariaLabel="Review registry"
          />
        )}
      </StrataPanel>
      <StrataPanel
        title="Snapshot registry"
        icon={<Lock size={16} />}
        count={snapshotRegistryRows.length}
        noPadding
        testId="strata-reviews-snapshot-registry"
        actions={<span style={captionStyle}>Supersede chains narrated — nothing silently replaced</span>}
      >
        <JiraTable<SnapshotRegistryRow>
          columns={snapshotColumns}
          data={snapshotRegistryRows}
          getRowId={(r) => r.snapshot.id}
          onRowClick={(r) => navigate(Routes.strata.review(r.snapshot.snapshot_key))}
          showRowCount={false}
          ariaLabel="Snapshot registry"
        />
      </StrataPanel>
      {periodGovernancePanel}
    </>
  );

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
          ) : !isDetail ? (
            reviewsIndex
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
                      {selectedStage ? (
                        <StatusLozenge status={selectedStage.status} label={selectedStage.label} appearance={selectedStage.appearance} />
                      ) : null}
                      <span style={{ marginLeft: 'auto' }}>
                        <Button
                          appearance="default"
                          spacing="compact"
                          iconBefore={<FileBarChart size={14} />}
                          onClick={() => navigate(Routes.strata.boardPack(selected.snapshot_key))}
                          testId="strata-cockpit-board-pack"
                        >
                          Board pack
                        </Button>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <FactChip icon={<Database size={12} />} value={configCount} label={`config version${configCount === 1 ? '' : 's'}`} />
                      <FactChip icon={<GitBranch size={12} />} value={runCount} label={`data run${runCount === 1 ? '' : 's'}`} />
                      <FactChip icon={<CalendarClock size={12} />} value={periodName(selected.period_id)} label="" />
                    </div>
                  </div>

                  {/* ── Snapshot identity band (anchor 10): persistent locked context ── */}
                  <StrataSnapshotBand
                    snapshotKey={selected.snapshot_key}
                    frozenAt={selected.locked_at ? fmtDateTime(selected.locked_at) : null}
                    basis={`${items.length} frozen record${items.length === 1 ? '' : 's'} · ${kpiItemCount} KPI${kpiItemCount === 1 ? '' : 's'} · ${benefitItemCount} benefit${benefitItemCount === 1 ? '' : 's'} · every number below is snapshot truth`}
                    testId="strata-cockpit-identity"
                    actions={selected.period_id && frozenKpis.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setCompareOpen((v) => !v)}
                        aria-expanded={compareOpen}
                        style={{ background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit', color: 'var(--ds-text-brand)', cursor: 'pointer', fontWeight: 600 }}
                        data-testid="strata-cockpit-compare-toggle"
                      >
                        {compareOpen ? 'Hide comparison' : 'Compare with live'}
                      </button>
                    ) : undefined}
                  />

                  {/* ── Compare with live (anchor 10, P4-D5): frozen vs recalculated, restatements flagged ── */}
                  {compareOpen ? (
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)', overflow: 'hidden' }} data-testid="strata-cockpit-compare">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
                        <span style={{ ...bodyStyle, fontWeight: 600 }}>Snapshot vs live</span>
                        <span style={captionStyle}>
                          {compareLoading
                            ? 'Recalculating…'
                            : `${compareRows.filter((r) => r.hasLive).length} KPI${compareRows.filter((r) => r.hasLive).length === 1 ? '' : 's'} compared · ${restatedRows.length} restated`}
                        </span>
                      </div>
                      {compareLoading ? (
                        <div style={{ padding: 16 }}>{skeletonBlock(72)}</div>
                      ) : restatedRows.length === 0 ? (
                        <div style={{ padding: 16 }}>
                          <EmptyState size="compact" header="Snapshot matches live" description="No KPI has been restated since this snapshot was frozen — every number here is still current." />
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) 1fr 1fr 0.6fr', gap: 8, padding: '8px 16px', borderBottom: `1px solid ${T.border}`, ...captionStyle, fontWeight: 600 }}>
                            <span>KPI</span><span>Snapshot</span><span>Live now</span><span style={{ textAlign: 'end' }}>Δ</span>
                          </div>
                          {restatedRows.map((r) => {
                            const delta = r.liveValue != null && r.frozenValue != null ? r.liveValue - r.frozenValue : null;
                            return (
                              <div key={r.kpiId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) 1fr 1fr 0.6fr', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, alignItems: 'center' }} data-testid={`strata-compare-row-${r.kpiId}`}>
                                <span style={{ ...bodyStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ ...captionStyle, color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>{r.frozenValue != null ? `${r.frozenValue.toFixed(1)}%` : '—'}</span>
                                  {r.frozenBand ? <StrataBandLozenge bandKey={r.frozenBand} /> : null}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ ...captionStyle, color: T.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.liveValue != null ? `${r.liveValue.toFixed(1)}%` : '—'}</span>
                                  {r.liveBand ? <StrataBandLozenge bandKey={r.liveBand} /> : null}
                                </span>
                                <span style={{ ...captionStyle, textAlign: 'end', fontVariantNumeric: 'tabular-nums', color: 'var(--ds-text-warning)', fontWeight: 600 }}>
                                  {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  ) : null}

                  {/* ── Review lifecycle strip (anchor 10): staged review position ── */}
                  <div
                    style={{ padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)' }}
                    data-testid="strata-cockpit-lifecycle"
                  >
                    <div style={{ ...captionStyle, fontWeight: 700, letterSpacing: '0.04em', color: T.subtlest, marginBottom: 8 }}>REVIEW LIFECYCLE</div>
                    <StrataLifecycleStepper variant="full" steps={selectedLifecycle} ariaLabel={`Review lifecycle for ${selected.name}`} />
                  </div>

                  {detailError ? (
                    <SectionMessage appearance="error" title="Some review data could not be loaded">
                      <p>{detailError.message}</p>
                    </SectionMessage>
                  ) : null}

                  {keyMetrics.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }} data-testid="strata-pack-key-metrics">
                      <PackSection n="01" title="Key metrics" />
                      <StrataStatStrip items={keyMetrics} />
                    </div>
                  ) : null}

                  <PackSection n={packNo(1)} title="Frozen evidence" />
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

                  {govError ? (
                    <SectionMessage appearance="error" title="Governance action rejected">
                      <p style={{ whiteSpace: 'pre-wrap' }}>{govError}</p>
                    </SectionMessage>
                  ) : null}

                  <PackSection n={packNo(2)} title="Decisions & actions" />
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }} data-testid="strata-reviews-registers">
                    {/* ── Decision register (left, ~7fr): evidence culminations ── */}
                    <div style={{ flex: '7 1 420px', minWidth: 0 }}>
                      <StrataPanel
                        title="Decisions on the table"
                        icon={<FileBarChart size={16} />}
                        count={snapshotDecisions.length}
                        noPadding
                        testId="strata-reviews-decisions"
                        actions={canAuthor ? (
                          <Button
                            appearance="primary"
                            spacing="compact"
                            onClick={() => setNewDecisionOpen(true)}
                            testId="strata-reviews-new-decision"
                          >
                            New decision
                          </Button>
                        ) : undefined}
                      >
                        {snapshotDecisions.length === 0 ? (
                          <div style={{ padding: 16 }}>
                            <EmptyState size="compact" header="No decisions recorded against this snapshot" description="Decisions made on this snapshot's evidence will appear here." />
                          </div>
                        ) : (
                          snapshotDecisions.map(renderDecision)
                        )}
                      </StrataPanel>
                    </div>
                    {/* ── Actions register (right, ~5fr): born from decisions, carry ancestry ── */}
                    <div style={{ flex: '5 1 300px', minWidth: 0 }}>
                      <StrataPanel
                        title="Actions"
                        icon={<CalendarClock size={16} />}
                        count={snapshotActions.rows.length}
                        noPadding
                        testId="strata-reviews-actions-register"
                        actions={<span style={captionStyle}>Each action carries its decision + snapshot</span>}
                      >
                        {snapshotActions.rows.length === 0 ? (
                          <div style={{ padding: 16 }}>
                            <EmptyState size="compact" header="No actions yet" description="Actions are born from decisions and carry that ancestry." />
                          </div>
                        ) : (
                          <>
                            {snapshotActions.rows.map((x) => renderActionRow(x.action, x.decisionKey))}
                            <div style={{ padding: '12px 16px', ...captionStyle, background: T.sunken }} data-testid="strata-reviews-followup-footer">
                              Follow-ups: {snapshotActions.closed} of {snapshotActions.rows.length} closed
                              {snapshotActions.overdue > 0 ? (
                                <> · <span style={{ color: 'var(--ds-text-danger)', fontWeight: 600 }}>{snapshotActions.overdue} overdue</span></>
                              ) : null}
                            </div>
                          </>
                        )}
                      </StrataPanel>
                    </div>
                  </div>

                  {/* Unlinked decisions — clearly labeled, never implied as snapshot membership */}
                  {snapshotDecisions.length === 0 && allDecisions.length > 0 ? (
                    <StrataPanel title="All decisions" icon={<FileBarChart size={16} />} count={allDecisions.length} testId="strata-reviews-all-decisions">
                      <p style={{ ...captionStyle, margin: '0 0 8px' }}>
                        Recorded across all snapshots — not linked to {selected.snapshot_key}.
                      </p>
                      {allDecisions.map(renderDecision)}
                    </StrataPanel>
                  ) : null}

                  <PackSection n={packNo(3)} title="Distribution & audit" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <StrataPanel
                      title="Board packs"
                      icon={<FileBarChart size={16} />}
                      count={(boardPacksQ.data ?? []).length}
                      testId="strata-reviews-board-packs"
                      actions={
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Tooltip content="Builds the executive PDF from this snapshot's frozen data, downloads it, and stores it to the shared pack library">
                            <Button
                              appearance="primary"
                              spacing="compact"
                              onClick={() => generatePack('pdf')}
                              isDisabled={packBusy !== null}
                              testId="strata-reviews-generate-pack-pdf"
                            >
                              {packBusy === 'pdf' ? 'Generating…' : 'Generate board pack (PDF)'}
                            </Button>
                          </Tooltip>
                          <Tooltip content="Builds the executive PPTX from this snapshot's frozen data, downloads it, and stores it to the shared pack library">
                            <Button
                              appearance="default"
                              spacing="compact"
                              onClick={() => generatePack('pptx')}
                              isDisabled={packBusy !== null}
                              testId="strata-reviews-generate-pack-pptx"
                            >
                              {packBusy === 'pptx' ? 'Generating…' : 'PPTX'}
                            </Button>
                          </Tooltip>
                        </div>
                      }
                    >
                      {packError ? (
                        <div style={{ marginBottom: 8 }}>
                          <SectionMessage appearance="error" title="Board pack generation failed">
                            <p>{packError}</p>
                          </SectionMessage>
                        </div>
                      ) : null}
                      {packNote ? (
                        <div style={{ marginBottom: 8 }}>
                          <SectionMessage appearance="success" title="Board pack generated">
                            <p>{packNote}</p>
                          </SectionMessage>
                        </div>
                      ) : null}
                      {(boardPacksQ.data ?? []).length === 0 ? (
                        <EmptyState size="compact" header="No board packs" description="Generated board packs for this snapshot appear here." />
                      ) : (
                        (boardPacksQ.data ?? []).map((bp) => {
                          const isReady = bp.status === 'ready';
                          const isUrl = typeof bp.storage_path === 'string' && /^https?:\/\//.test(bp.storage_path);
                          const hasStoredBinary = typeof bp.storage_path === 'string' && bp.storage_path.length > 0 && !isUrl;
                          return (
                            <div key={bp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: `1px solid ${T.border}` }} data-testid={`strata-reviews-pack-${bp.id}`}>
                              <CatalystTag text={bp.format.toUpperCase()} />
                              <StatusLozenge status={bp.status} label={labelize(bp.status)} appearance={PACK_LOZENGE[bp.status] ?? 'default'} />
                              <span style={{ ...captionStyle, flex: 1 }}>{fmtDateTime(bp.generated_at)}</span>
                              {isReady && isUrl ? (
                                <Button appearance="default" spacing="compact" onClick={() => window.open(bp.storage_path as string, '_blank', 'noopener')}>
                                  Download
                                </Button>
                              ) : isReady && hasStoredBinary ? (
                                <Tooltip content="Downloads via a 1-hour signed link — the pack bucket is private">
                                  <Button appearance="default" spacing="compact" onClick={() => downloadStoredPack(bp.id, bp.storage_path as string)}>
                                    Download
                                  </Button>
                                </Tooltip>
                              ) : isReady ? (
                                <Tooltip content="Generated before pack storage existed — regenerate to store a retrievable copy">
                                  {/* Lozenge, not CatalystTag color="green": a bare colour name is a
                                      hard-coded colour (it breached the strict ratchet and broke CI),
                                      and every other CatalystTag on this page passes no color at all.
                                      ADS lets the component own its colour. */}
                                  <Lozenge appearance="success">Ready</Lozenge>
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

      {/* ── New decision (Lane G) — server assigns DEC-xxxx; RPC errors render in-modal ── */}
      {canAuthor ? (
        <StrataFormModal
          open={newDecisionOpen}
          onClose={() => setNewDecisionOpen(false)}
          title="New decision"
          description={isDetail && selected
            ? <>Recorded against snapshot <strong style={{ color: T.text }}>{selected.snapshot_key}</strong>. The decision key is assigned by the server.</>
            : 'The decision key is assigned by the server.'}
          fields={[
            { key: 'title', label: 'Title', kind: 'text', required: true },
            { key: 'decision_type', label: 'Type', kind: 'select', required: true, options: DECISION_TYPE_OPTIONS },
            { key: 'forum', label: 'Forum', kind: 'text', placeholder: 'e.g. Quarterly business review' },
            { key: 'description', label: 'Description', kind: 'textarea' },
            { key: 'owner_id', label: 'Owner', kind: 'user' },
            { key: 'due_date', label: 'Due date', kind: 'date' },
          ]}
          initial={{ decision_type: 'governance' }}
          submitLabel="Create decision"
          onSubmit={async (v) => {
            await governanceApi.createDecision({
              title: (v.title as string).trim(),
              decisionType: v.decision_type as StrataDecision['decision_type'],
              forum: (v.forum as string | null) || undefined,
              description: (v.description as string | null) || undefined,
              ownerId: (v.owner_id as string | null) || undefined,
              dueDate: (v.due_date as string | null) || undefined,
              snapshotId: isDetail && selected ? selected.id : undefined,
            });
            invalidate();
          }}
          testId="strata-reviews-new-decision-modal"
        />
      ) : null}

      {/* ── New action on a decision — server assigns ACT-xxxx ── */}
      {canAuthor && actionTargetId ? (() => {
        const target = allDecisions.find((d) => d.id === actionTargetId);
        if (!target) return null;
        return (
          <StrataFormModal
            open
            onClose={() => setActionTargetId(null)}
            title={`New action — ${target.decision_key}`}
            description={<>Follow-up action for <strong style={{ color: T.text }}>{target.title}</strong>. The action key is assigned by the server.</>}
            fields={[
              { key: 'title', label: 'Title', kind: 'text', required: true },
              { key: 'owner_id', label: 'Owner', kind: 'user' },
              { key: 'due_date', label: 'Due date', kind: 'date' },
              { key: 'note', label: 'Note', kind: 'textarea' },
            ]}
            submitLabel="Create action"
            onSubmit={async (v) => {
              await governanceApi.createAction({
                decisionId: target.id,
                title: (v.title as string).trim(),
                ownerId: (v.owner_id as string | null) || undefined,
                dueDate: (v.due_date as string | null) || undefined,
                note: (v.note as string | null) || undefined,
              });
              invalidate();
            }}
            testId="strata-reviews-new-action-modal"
          />
        );
      })() : null}
    </StrataPageShell>
  );
}
