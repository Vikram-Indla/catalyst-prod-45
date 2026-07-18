/**
 * STRATA Board Pack — editorial preview + Present mode (anchor 24, slice 4G) + the
 * board-pack EDITORIAL LIFECYCLE (R2/F1, capability 7).
 * Route: /strata/reviews/:snapshotKey/pack.
 *
 * Scope (P4-D2): a READ-ONLY editorial arc generated CLIENT-SIDE from the frozen
 * snapshot (items + decisions + actions) — Cover · Condition · Explanation · Value ·
 * Decisions · Follow-through, each with a per-page snapshot stamp. Present mode is a
 * chrome-stripped 16:9 overlay stepped by ←/→ (Esc returns to the cockpit). Print/PDF
 * reuses the existing generateBoardPackPdf.
 * Narrative is GROUNDED prose composed from real snapshot figures; missing data renders
 * as an honest labeled gap, never invented. ADS tokens only.
 *
 * R2/F1 (2026-07-17) — the scoping note above previously said Issue was "DEFERRED to a
 * separate backend feature". That is now STALE: strata_issue_board_pack,
 * strata_supersede_board_pack and the strata_board_pack_qualification view exist
 * (migration 20260717140000), so issuance, supersession and the F-3 provenance
 * qualification are real governed flows here — see PackVersionsSection.
 * The narrative BUILDER (editing/reordering `sections`) still has no backing RPC, so no
 * authoring affordance is offered for it — the arc above stays a generated preview.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button, EmptyState, Lozenge, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Spinner, Textfield,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
// NB: the Present-mode affordance uses `Presentation` deliberately. The icon
// library also exposes one named after the legacy element type retired by the
// Theme rename, which REQ-003 (CAT-STRATA-FOUNDATION-20260709-001) bans across
// this module — its guard is a text scan covering comments too, and correctly
// cannot tell an icon identifier from a UI label. Don't reintroduce it here.
import { ChevronLeft, ChevronRight, FileBarChart, Presentation, X } from '@/lib/atlaskit-icons';
import {
  useSnapshotByKey, useSnapshotItems, useDecisions, useActions, useStrataContext, useProfileNames,
  useBoardPacks, useStrataRoles, useInvalidateStrata,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, StrataSnapshotBand, T } from '@/modules/strata/components/shared';
import { governanceApi } from '@/modules/strata/domain';
import { generateBoardPackPdf, type BoardPackData } from '@/modules/strata/lib/boardPack';
import { fmtDate, fmtDateTime, labelize } from '@/modules/strata/components/format';
import type {
  StrataAction, StrataBoardPack, StrataBoardPackQualification, StrataDecision, StrataSnapshot,
} from '@/modules/strata/types';

interface SnapshotItemRow { id: string; snapshot_id: string; entity_type: string; entity_id: string | null; payload: Record<string, unknown> | null; }

const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };

/** One editorial page (grounded body + snapshot-stamp page number). */
interface PackPage { id: string; kicker: string; title: string; body: React.ReactNode; }

const DECISION_LOZENGE: Record<StrataDecision['status'], 'inprogress' | 'success' | 'default'> = {
  open: 'inprogress', decided: 'success', closed: 'default',
};

// ── R2/F1 · board-pack editorial lifecycle ───────────────────────────────────
// F-12: `status` and `issue_status` are two INDEPENDENT lifecycles and are rendered as two
// independent things. `status` answers "has the artefact rendered?" (pending|generating|ready|
// failed); `issue_status` answers "has the Strategy Office approved and issued it?"
// (draft|in_review|approved|issued|superseded). A pack can be ready and unissued, or issued and
// pending a re-render. Do not collapse these into one column or one badge.
const GENERATION_LOZENGE: Record<StrataBoardPack['status'], LozengeAppearance> = {
  pending: 'default', generating: 'inprogress', ready: 'success', failed: 'removed',
};
const ISSUE_LOZENGE: Record<StrataBoardPack['issue_status'], LozengeAppearance> = {
  draft: 'default', in_review: 'inprogress', approved: 'moved', issued: 'success', superseded: 'removed',
};

const LIST_STYLE: React.CSSProperties = { margin: 'var(--ds-space-100) 0 0', paddingLeft: 'var(--ds-space-250)' };
const metaStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtle };

/**
 * F-3 provenance qualification, straight off the `strata_board_pack_qualification` VIEW.
 *
 * A qualification is about PROVENANCE, not the numbers: the figures in the pack are OFFICIAL and
 * UNCHANGED — they were frozen when the snapshot locked. `qualification_note` states exactly that,
 * so it is rendered VERBATIM; paraphrasing it into "these numbers are unreliable" would be a
 * straight falsehood about a document a board has already read.
 *
 * And `is_qualified === false` is rendered as what it is — no exception ON RECORD. Per E-4/§3.7
 * that is not proof of integrity for anything predating the child audit triggers, so it gets no
 * tick, no "verified", no success styling. Absence of a record is not evidence.
 */
function QualificationPanel({ qual }: { qual: StrataBoardPackQualification }) {
  if (!qual.is_qualified) {
    return (
      <div data-testid="strata-pack-qualification">
        <SectionMessage appearance="information" title="No integrity exception is on record for this snapshot">
          <p style={{ margin: 0 }} data-testid="strata-pack-no-exception">
            This is not a verification. An exception can only be on record where one was detected, and
            detection does not reach back before the child audit triggers (E-4/§3.7) — so the absence of a
            record is not evidence that this pack&rsquo;s provenance is reproducible.
          </p>
        </SectionMessage>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-150)' }} data-testid="strata-pack-qualification">
      {/* The view's own wording, rendered verbatim — it is the sentence a board reader must see,
          and it is precise about what is and is not in doubt. Never summarised. */}
      <SectionMessage appearance="warning" title="Provenance is qualified — the figures are official and unchanged">
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }} data-testid="strata-pack-qualification-note">
          {qual.qualification_note}
        </p>
      </SectionMessage>
      <ul style={LIST_STYLE}>
        {qual.provenance_reproducibility ? (
          <li style={metaStyle}>Provenance reproducibility: {qual.provenance_reproducibility}</li>
        ) : null}
        {/* Zero-assumption: null is unknown, and unknown renders nothing — not "No". */}
        {qual.values_changed != null ? (
          <li style={metaStyle}>Values changed: {qual.values_changed ? 'yes' : 'no'}</li>
        ) : null}
        {qual.resolution ? <li style={metaStyle}>Resolution: {qual.resolution}</li> : null}
        {qual.detection_is_lower_bound === true ? (
          <li style={metaStyle}>Detection is a lower bound — more records may be affected than are listed.</li>
        ) : null}
      </ul>
    </div>
  );
}

/**
 * Pack versions + issuance (R2/F1). Exported so the governed lifecycle can be tested directly:
 * rendering the whole page drags in the STRATA shell and would prove the shell, not this.
 */
export function PackVersionsSection({
  snapshotId, snapshotStatus, onError,
}: {
  snapshotId: string;
  snapshotStatus: StrataSnapshot['status'];
  onError: (msg: string | null) => void;
}) {
  const q = useBoardPacks(snapshotId);
  const roles = useStrataRoles();
  const profiles = useProfileNames();
  const invalidate = useInvalidateStrata();
  // Mirrors both RPCs' role gate. The server is the boundary; this only avoids offering a verb it
  // would refuse.
  const canGovern = (roles.data ?? []).some((r) => r === 'strategy_office' || r === 'strata_admin');

  const packs = useMemo(
    () => [...(q.data ?? [])].sort((a, b) => b.version - a.version),
    [q.data],
  );

  const [qual, setQual] = useState<{ pack: StrataBoardPack; data: StrataBoardPackQualification | null } | null>(null);
  const [approving, setApproving] = useState<StrataBoardPack | null>(null);
  const [issuing, setIssuing] = useState<StrataBoardPack | null>(null);
  const [superseding, setSuperseding] = useState<StrataBoardPack | null>(null);
  // Shared by the approve and issue modals — only one is ever open, and each resets it on open.
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const openQualification = async (pack: StrataBoardPack) => {
    setBusy(true); onError(null);
    try {
      setQual({ pack, data: await governanceApi.boardPackQualification(pack.id) });
    } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const confirmApprove = async () => {
    if (!approving) return;
    setBusy(true); onError(null);
    try {
      // The note is sent only if one was actually typed — the RPC defaults it to NULL and writes its
      // own audit wording, so an invented default would put words in the approver's mouth.
      await governanceApi.approveBoardPack(approving.id, note.trim() || undefined);
      invalidate();
      setApproving(null); setNote('');
    } catch (e) {
      // Verbatim: the RPC names the exact rule it hit ("already approved", "already issued — the
      // board received it…", the role refusal). Re-wording it would lose which control fired.
      onError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const confirmIssue = async () => {
    if (!issuing) return;
    setBusy(true); onError(null);
    try {
      await governanceApi.issueBoardPack(issuing.id, note.trim() || undefined);
      invalidate();
      setIssuing(null); setNote('');
    } catch (e) {
      // The RPC's refusals — SoD ("the approver cannot also issue the pack"), an unlocked snapshot,
      // an unready artefact — are surfaced VERBATIM. They are precise about which control fired;
      // inventing our own copy for them would lose that.
      onError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const confirmSupersede = async () => {
    if (!superseding || reason.trim() === '') return;
    setBusy(true); onError(null);
    try {
      await governanceApi.supersedeBoardPack(superseding.id, reason.trim());
      invalidate();
      setSuperseding(null); setReason('');
    } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const actorName = (id: string | null): string | null => (id ? profiles.data?.get(id)?.name ?? null : null);
  const versionOf = (packId: string | null): number | null =>
    (packId ? packs.find((p) => p.id === packId)?.version ?? null : null);

  /**
   * The blocker that stops an APPROVED pack being issued, named rather than discovered by a round
   * trip. Both conditions are the RPC's own (20260717140000) and both are knowable here.
   * SoD is deliberately NOT pre-empted: only the server knows who approved vs who is asking, so its
   * refusal is surfaced verbatim instead of guessed at.
   */
  const issueBlocker = (pack: StrataBoardPack): string | null => {
    if (snapshotStatus !== 'locked') return `Snapshot is ${labelize(snapshotStatus)}, not locked — its numbers could still change`;
    if (pack.status !== 'ready') return `Artefact is ${labelize(pack.status)}, not ready — there is nothing to issue`;
    return null;
  };

  /**
   * The one blocker `strata_approve_board_pack` (20260717200000) applies beyond the editorial state
   * itself: a pack with no snapshot has no numbers to point at, so there would be no record of what
   * was approved.
   *
   * Approval deliberately does NOT require a LOCKED snapshot — only issuance does. R2/F1 chose not to
   * impose that gate because a pack may legitimately be reviewed and approved while its period is
   * still open, so no such check is invented here.
   */
  const approveBlocker = (pack: StrataBoardPack): string | null =>
    (pack.snapshot_id ? null : 'No snapshot — there would be no record of which numbers were approved');

  const columns: Column<StrataBoardPack>[] = [
    {
      id: 'version', label: 'Version', width: 18,
      cell: ({ row }) => {
        const prev = versionOf(row.supersedes_id);
        return (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-025)', minWidth: 0 }}>
            <span style={{ ...bodyStyle, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>v{row.version}</span>
            {/* A correction points BACK at what it corrects; the predecessor is never rewritten. */}
            {row.supersedes_id ? (
              <span style={captionStyle} data-testid={`strata-pack-supersedes-${row.id}`}>
                {prev != null ? `corrects v${prev}` : 'corrects an earlier version'}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      // GENERATION — whether the file rendered. Separate column from the editorial state by design
      // (F-12): they are orthogonal facts and a reader must be able to tell them apart.
      id: 'artefact', label: 'Artefact', width: 16,
      cell: ({ row }) => (
        <span data-testid={`strata-pack-generation-${row.id}`} style={{ display: 'inline-flex' }}>
          <StatusLozenge
            status={row.status}
            label={labelize(row.status)}
            appearance={GENERATION_LOZENGE[row.status] ?? 'default'}
          />
        </span>
      ),
    },
    {
      // EDITORIAL — whether the Strategy Office issued it.
      id: 'editorial', label: 'Editorial state', width: 18,
      cell: ({ row }) => (
        <span data-testid={`strata-pack-issue-status-${row.id}`} style={{ display: 'inline-flex' }}>
          <StatusLozenge
            status={row.issue_status}
            label={labelize(row.issue_status)}
            appearance={ISSUE_LOZENGE[row.issue_status] ?? 'default'}
          />
        </span>
      ),
    },
    {
      id: 'issued', label: 'Issued', width: 18,
      cell: ({ row }) => {
        const who = actorName(row.issued_by);
        // Zero-assumption: an unissued pack has no issuer and no date — it renders as nothing.
        if (!row.issued_at && !who) return <span style={metaStyle}>—</span>;
        return (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-025)', minWidth: 0 }}>
            {row.issued_at ? <span style={metaStyle}>{fmtDateTime(row.issued_at)}</span> : null}
            {who ? <span style={captionStyle}>by {who}</span> : null}
          </span>
        );
      },
    },
    {
      id: 'actions', label: 'Governance', width: 30,
      cell: ({ row }) => {
        const blocker = issueBlocker(row);
        return (
          <span style={{ display: 'inline-flex', gap: 'var(--ds-space-075)', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              spacing="compact" appearance="subtle" isDisabled={busy}
              testId={`strata-pack-provenance-${row.id}`}
              onClick={() => void openQualification(row)}
            >
              Provenance
            </Button>
            {!canGovern ? null : row.issue_status === 'issued' ? (
              // Issued packs are IMMUTABLE BY TRIGGER — the DB refuses UPDATE and DELETE alike. So
              // no edit and no delete is offered: the only change the server permits is a
              // superseding version, and the UI offers exactly that and nothing else.
              <Button
                spacing="compact" appearance="warning" isDisabled={busy}
                testId={`strata-pack-supersede-${row.id}`}
                onClick={() => { setReason(''); setSuperseding(row); }}
              >
                Supersede
              </Button>
            ) : row.issue_status === 'superseded' ? (
              // Terminal by rule (the trigger refuses reinstatement). Say so rather than render a
              // row of dead buttons.
              <span style={metaStyle} data-testid={`strata-pack-terminal-${row.id}`}>Superseded — terminal</span>
            ) : row.issue_status === 'approved' ? (
              blocker ? (
                <span style={metaStyle} data-testid={`strata-pack-issue-blocked-${row.id}`}>{blocker}</span>
              ) : (
                <Button
                  spacing="compact" appearance="primary" isDisabled={busy}
                  testId={`strata-pack-issue-${row.id}`}
                  onClick={() => { setNote(''); setIssuing(row); }}
                >
                  Issue
                </Button>
              )
            ) : (
              // draft / in_review — the only states strata_approve_board_pack accepts. It is never
              // offered on approved/issued/superseded above, each of which the RPC refuses by name.
              approveBlocker(row) ? (
                <span style={metaStyle} data-testid={`strata-pack-approve-blocked-${row.id}`}>{approveBlocker(row)}</span>
              ) : (
                <Button
                  spacing="compact" appearance="primary" isDisabled={busy}
                  testId={`strata-pack-approve-${row.id}`}
                  onClick={() => { setNote(''); setApproving(row); }}
                >
                  Approve
                </Button>
              )
            )}
          </span>
        );
      },
    },
  ];

  return (
    <StrataPanel
      title="Versions & issuance"
      icon={<FileBarChart size={16} />}
      count={packs.length}
      testId="strata-board-pack-versions"
      actions={canGovern ? null : <Lozenge appearance="new">Read-only for your role</Lozenge>}
    >
      <p style={{ ...captionStyle, margin: '0 0 12px' }}>
        Issuance is what makes a pack a board record. An issued pack is immutable — not by convention but
        by database trigger — because the board received it and that fact cannot be unmade. A correction is a
        new version that supersedes the old one over the same snapshot: the numbers are the snapshot&rsquo;s and
        are never re-pointed. Approving and issuing are separate hands.
      </p>
      {q.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
      ) : q.isError ? (
        <SectionMessage appearance="error" title="Failed to load board packs">
          <p>{q.error instanceof Error ? q.error.message : 'Unknown error'}</p>
        </SectionMessage>
      ) : packs.length === 0 ? (
        <EmptyState
          size="compact"
          header="No pack has been generated for this snapshot"
          description="Print / PDF generates the artefact; issuance becomes available once it is approved."
        />
      ) : (
        <JiraTable<StrataBoardPack>
          columns={columns}
          data={packs}
          getRowId={(p) => p.id}
          showRowCount={false}
          ariaLabel="Board pack versions"
        />
      )}

      {/* Provenance — read-only, opened from the row. */}
      <Modal isOpen={!!qual} onClose={() => setQual(null)} width="medium">
        <ModalHeader><ModalTitle>Provenance · {qual ? `v${qual.pack.version}` : ''}</ModalTitle></ModalHeader>
        <ModalBody>
          {qual?.data
            ? <QualificationPanel qual={qual.data} />
            : <p style={metaStyle}>No qualification record was returned for this pack.</p>}
        </ModalBody>
        <ModalFooter><Button appearance="subtle" onClick={() => setQual(null)}>Close</Button></ModalFooter>
      </Modal>

      {/* Approve. The note is optional (the RPC defaults it to NULL and supplies its own audit
          wording). The approver is stamped by the server from auth.uid() and is never sent from
          here — a client-supplied approver would defeat the approver≠issuer check that issuance
          depends on. */}
      <Modal isOpen={!!approving} onClose={() => setApproving(null)} width="small">
        <ModalHeader><ModalTitle>{approving ? `Approve v${approving.version}` : ''}</ModalTitle></ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            Approving records that you reviewed this pack over its snapshot. You are recorded as the
            approver, and the pack must then be issued by someone else. Approval does not require the
            snapshot to be locked — issuing it does.
          </p>
          <Textfield
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Approve note"
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setApproving(null)}>Cancel</Button>
          <Button appearance="primary" isDisabled={busy} testId="strata-pack-approve-confirm" onClick={() => void confirmApprove()}>
            Approve
          </Button>
        </ModalFooter>
      </Modal>

      {/* Issue. The note is optional (the RPC defaults it to NULL); it is stamped into the audit
          trail alongside the qualification that was true at issuance. */}
      <Modal isOpen={!!issuing} onClose={() => setIssuing(null)} width="small">
        <ModalHeader><ModalTitle>{issuing ? `Issue v${issuing.version}` : ''}</ModalTitle></ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            Issuing records this pack as the artefact the board received. It becomes immutable: the only
            change permitted afterwards is a superseding version. The approver may not also be the issuer.
          </p>
          <Textfield
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Issue note"
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setIssuing(null)}>Cancel</Button>
          <Button appearance="primary" isDisabled={busy} testId="strata-pack-issue-confirm" onClick={() => void confirmIssue()}>
            Issue
          </Button>
        </ModalFooter>
      </Modal>

      {/* Supersede. The reason is MANDATORY — the RPC refuses without one, and the board must be told
          why the pack changed — so it is collected BEFORE the round trip, not discovered from an error. */}
      <Modal isOpen={!!superseding} onClose={() => setSuperseding(null)} width="small">
        <ModalHeader><ModalTitle>{superseding ? `Supersede v${superseding.version}` : ''}</ModalTitle></ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            This creates a new draft version over the same snapshot and retires this one. What the board read
            stays exactly as they read it — nothing about it is edited, and its numbers are not re-pointed.
          </p>
          <Textfield
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)"
            aria-label="Supersede reason"
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setSuperseding(null)}>Cancel</Button>
          <Button
            appearance="warning"
            isDisabled={busy || reason.trim() === ''}
            testId="strata-pack-supersede-confirm"
            onClick={() => void confirmSupersede()}
          >
            Supersede
          </Button>
        </ModalFooter>
      </Modal>
    </StrataPanel>
  );
}

export default function StrataBoardPackPage() {
  const { snapshotKey } = useParams<{ snapshotKey: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { cycles, periods } = useStrataContext();

  const snapQ = useSnapshotByKey(snapshotKey);
  const snapshot = snapQ.data ?? null;
  const itemsQ = useSnapshotItems(snapshot?.id);
  const items = useMemo(() => (itemsQ.data ?? []) as SnapshotItemRow[], [itemsQ.data]);
  const decisionsQ = useDecisions();
  const actionsQ = useActions();
  const profilesQ = useProfileNames();
  const profileName = (id: string | null | undefined): string => (id ? profilesQ.data?.get(id)?.name ?? '—' : '—');

  const snapshotDecisions = useMemo<StrataDecision[]>(
    () => (snapshot ? (decisionsQ.data ?? []).filter((d) => d.snapshot_id === snapshot.id) : []),
    [decisionsQ.data, snapshot],
  );
  const snapshotActions = useMemo<StrataAction[]>(() => {
    const ids = new Set(snapshotDecisions.map((d) => d.id));
    return (actionsQ.data ?? []).filter((a) => a.decision_id && ids.has(a.decision_id));
  }, [actionsQ.data, snapshotDecisions]);

  // KPI band tallies from the frozen items — the numbers the Condition page states.
  const kpiTally = useMemo(() => {
    const kpis = items.filter((i) => i.entity_type === 'kpi');
    let onTrack = 0; let watch = 0; let below = 0;
    kpis.forEach((i) => {
      const band = typeof i.payload?.status_key === 'string' ? i.payload.status_key : null;
      if (band === 'green' || band === 'on_track') onTrack += 1;
      else if (band === 'amber' || band === 'watch') watch += 1;
      else if (band === 'red' || band === 'below' || band === 'danger') below += 1;
    });
    return { total: kpis.length, onTrack, watch, below };
  }, [items]);
  const benefitCount = useMemo(() => items.filter((i) => i.entity_type === 'benefit').length, [items]);

  const cycleName = snapshot?.cycle_id ? cycles.find((c) => c.id === snapshot.cycle_id)?.name ?? null : null;
  const periodName = snapshot?.period_id ? periods.find((p) => p.id === snapshot.period_id)?.name ?? null : null;

  // ── Editorial arc (grounded prose only) ─────────────────────────────────────
  const pages = useMemo<PackPage[]>(() => {
    if (!snapshot) return [];
    const gap = (label: string) => <span style={{ color: T.subtlest }}>{label}</span>;
    return [
      {
        id: 'cover', kicker: 'COVER', title: snapshot.name,
        body: (
          <span>
            {cycleName ? `${cycleName} · ` : ''}{periodName ? `${periodName} · ` : ''}
            prepared by the Strategy Office from frozen snapshot truth. Narrative is editorial; every figure is snapshot-frozen and stamped per page.
          </span>
        ),
      },
      {
        id: 'condition', kicker: 'SECTION 01 · CONDITION', title: 'Where the strategy stands',
        body: kpiTally.total === 0 ? gap('No KPI evidence was frozen in this snapshot.') : (
          <span>
            {kpiTally.total} KPI{kpiTally.total === 1 ? '' : 's'} frozen — {kpiTally.onTrack} on track, {kpiTally.watch} on watch, {kpiTally.below} below threshold.
            The figures beside these words are the snapshot actuals, not a live recalculation.
          </span>
        ),
      },
      {
        id: 'explanation', kicker: 'SECTION 02 · EXPLANATION', title: 'What moved, and why',
        body: kpiTally.below + kpiTally.watch === 0
          ? <span>No frozen KPI is below threshold or on watch — the quarter held to plan on the measured lines.</span>
          : <span>{kpiTally.below} KPI{kpiTally.below === 1 ? '' : 's'} below threshold and {kpiTally.watch} on watch drive the movement. Each is validated actuals with its threshold context; commentary is tied to the frozen period.</span>,
      },
      {
        id: 'value', kicker: 'SECTION 03 · VALUE', title: 'Value at risk',
        body: benefitCount === 0
          ? gap('No benefit realization records were frozen in this snapshot — value-at-stake is not part of this pack.')
          : <span>{benefitCount} benefit{benefitCount === 1 ? '' : 's'} carry stage figures (planned → validated) in this snapshot; realized value awaiting validation is labeled as such.</span>,
      },
      {
        id: 'decisions', kicker: 'SECTION 04 · DECISIONS', title: 'Decisions with evidence',
        body: snapshotDecisions.length === 0 ? gap('No decisions have been recorded against this snapshot yet.') : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {snapshotDecisions.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <StatusLozenge status={d.status} label={d.status === 'open' ? 'OPEN' : 'RECORDED'} appearance={DECISION_LOZENGE[d.status] ?? 'default'} />
                <span style={bodyStyle}>{d.title}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'followthrough', kicker: 'SECTION 05 · FOLLOW-THROUGH', title: 'Actions & prior outcomes',
        body: snapshotActions.length === 0 ? gap('No follow-up actions have been assigned from this snapshot’s decisions.') : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {snapshotActions.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <StatusLozenge status={a.status} label={a.status.replace('_', ' ')} appearance={a.status === 'done' ? 'success' : a.status === 'cancelled' ? 'removed' : 'inprogress'} />
                <span style={bodyStyle}>{a.title}</span>
                <span style={captionStyle}>owner {profileName(a.owner_id)}{a.due_date ? ` · due ${fmtDate(a.due_date)}` : ''}</span>
              </div>
            ))}
          </div>
        ),
      },
    ];
  }, [snapshot, cycleName, periodName, kpiTally, benefitCount, snapshotDecisions, snapshotActions, profilesQ.data]);

  const stamp = snapshot ? `${snapshot.snapshot_key} · frozen ${snapshot.locked_at ? fmtDateTime(snapshot.locked_at) : '—'}` : '';

  // ── Print/PDF — reuse the existing generator (no ADS-token constraint inside binaries) ──
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept separate from `error`: a PDF generation failure and a refused governance action are
  // different events and get different titles — merging them would mislabel one of them.
  const [govError, setGovError] = useState<string | null>(null);
  const evidenceGroups = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.entity_type, (m.get(i.entity_type) ?? 0) + 1));
    return [...m.entries()] as Array<[string, number]>;
  }, [items]);
  const printPdf = async () => {
    if (!snapshot) return;
    setBusy(true); setError(null);
    try {
      const data: BoardPackData = {
        snapshot,
        cycleName, periodName,
        evidenceGroups,
        runCount: snapshot.data_run_ids?.length ?? 0,
        evidence: items.slice(0, 40).map((i) => ({
          entityType: i.entity_type,
          entity: typeof i.payload?.entity_name === 'string' ? i.payload.entity_name : '—',
          metric: typeof i.payload?.name === 'string' ? i.payload.name : (typeof i.payload?.metric_key === 'string' ? i.payload.metric_key : '—'),
          value: i.payload?.value != null ? String(i.payload.value) : '—',
          band: typeof i.payload?.status_key === 'string' ? i.payload.status_key : '—',
        })),
        decisions: snapshotDecisions.map((d) => ({ decision: d, ownerName: profileName(d.owner_id) })),
        openActions: snapshotActions.filter((a) => a.status === 'open' || a.status === 'in_progress').map((a) => ({ action: a, ownerName: profileName(a.owner_id) })),
      };
      const artifact = await generateBoardPackPdf(data);
      const url = URL.createObjectURL(artifact.blob);
      const link = document.createElement('a');
      link.href = url; link.download = artifact.filename; link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // ── Present mode (?present) — chrome-stripped 16:9, keyboard-stepped ─────────
  const presenting = params.get('present') != null;
  const sectionIdx = Math.max(0, Math.min(pages.length - 1, Number(params.get('section') ?? '0') || 0));
  const setSection = (i: number) => {
    const next = new URLSearchParams(params);
    next.set('present', ''); next.set('section', String(Math.max(0, Math.min(pages.length - 1, i))));
    setParams(next, { replace: true });
  };
  const openPresent = () => { const n = new URLSearchParams(params); n.set('present', ''); n.set('section', '0'); setParams(n); };
  const exitPresent = () => { const n = new URLSearchParams(params); n.delete('present'); n.delete('section'); setParams(n); };
  React.useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitPresent();
      else if (e.key === 'ArrowRight') setSection(sectionIdx + 1);
      else if (e.key === 'ArrowLeft') setSection(sectionIdx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (snapQ.isLoading) {
    return <StrataPageShell trail={[{ text: 'Reviews & decisions', href: Routes.strata.reviews() }]} hideTitle docTitle="Board pack" testId="strata-board-pack-chrome"><div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="large" /></div></StrataPageShell>;
  }
  if (!snapshot) {
    return (
      <StrataPageShell trail={[{ text: 'Reviews & decisions', href: Routes.strata.reviews() }]} hideTitle docTitle="Board pack" testId="strata-board-pack-chrome">
        <EmptyState
          header={`Snapshot ${snapshotKey} not found`}
          description="This board pack has no locked snapshot to render from."
          primaryAction={<Button onClick={() => navigate(Routes.strata.reviews())}>Back to reviews</Button>}
        />
      </StrataPageShell>
    );
  }

  // Present-mode overlay (rendered above the shell).
  if (presenting) {
    const page = pages[sectionIdx];
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: T.sunken, display: 'flex', flexDirection: 'column', padding: 24 }} data-testid="strata-board-pack-present" role="dialog" aria-label="Board pack present mode">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ ...captionStyle, fontWeight: 700, letterSpacing: '0.04em' }}>{snapshot.name}</span>
          <Button appearance="subtle" spacing="compact" iconBefore={<X size={14} />} onClick={exitPresent} testId="strata-present-exit">Exit</Button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <div style={{ width: '100%', maxWidth: 960, aspectRatio: '16 / 9', background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: 'var(--ds-shadow-overlay)', padding: 48, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <div style={{ ...captionStyle, fontWeight: 700, letterSpacing: '0.08em', color: T.brandText }}>{page.kicker} · {snapshot.snapshot_key}</div>
            <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: T.text, marginTop: 12, lineHeight: 1.25 }}>{page.title}</div>
            <div style={{ marginTop: 24, ...bodyStyle, lineHeight: 1.6 }}>{page.body}</div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 16, ...captionStyle }}>
              <span>← → step sections · Esc exits to cockpit</span>
              <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{sectionIdx + 1} / {pages.length}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <Button appearance="default" iconBefore={<ChevronLeft size={16} />} isDisabled={sectionIdx === 0} onClick={() => setSection(sectionIdx - 1)}>Previous</Button>
          <Button appearance="default" iconAfter={<ChevronRight size={16} />} isDisabled={sectionIdx === pages.length - 1} onClick={() => setSection(sectionIdx + 1)}>Next</Button>
        </div>
      </div>
    );
  }

  return (
    <StrataPageShell
      trail={[{ text: 'Reviews & decisions', href: Routes.strata.reviews() }, { text: snapshotKey!, href: Routes.strata.review(snapshotKey!) }]}
      title={`Board pack — ${snapshot.name}`}
      docTitle={`Board pack · ${snapshotKey}`}
      state={snapshot.status}
      headerActions={
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <Button appearance="default" iconBefore={<Presentation size={14} />} onClick={openPresent} testId="strata-board-pack-present-btn">Present mode</Button>
          <Button appearance="primary" iconBefore={<FileBarChart size={14} />} isDisabled={busy} onClick={() => void printPdf()} testId="strata-board-pack-print">
            {busy ? 'Preparing…' : 'Print / PDF'}
          </Button>
        </div>
      }
      testId="strata-board-pack-chrome"
    >
      <StrataSnapshotBand
        snapshotKey={snapshot.snapshot_key}
        frozenAt={snapshot.locked_at ? fmtDateTime(snapshot.locked_at) : null}
        basis="every page renders snapshot truth, stamped per page · narrative is editorial, figures are frozen"
        testId="strata-board-pack-identity"
      />

      {error ? (
        <div style={{ marginTop: 16 }}>
          <SectionMessage appearance="error" title="Could not generate the PDF"><p style={{ whiteSpace: 'pre-wrap' }}>{error}</p></SectionMessage>
        </div>
      ) : null}

      <div style={{ marginTop: 16, border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ ...bodyStyle, fontWeight: 600 }}>Pack structure — editorial arc</span>
          {/* Issue is no longer "a later feature" (R2/F1) — it is wired below. The narrative BUILDER
              still has no backing RPC, so only that half is still named as absent. */}
          <span style={{ marginLeft: 'auto', ...captionStyle }}>Generated preview · the narrative builder is a later feature</span>
        </div>
        <div style={{ display: 'flex', gap: 16, padding: 16, overflowX: 'auto', background: T.sunken }} data-testid="strata-board-pack-arc">
          {pages.map((page, i) => (
            <div key={page.id} style={{ width: 300, flexShrink: 0, aspectRatio: '0.773', background: T.raised, border: `1px solid ${T.border}`, borderRadius: 4, boxShadow: 'var(--ds-shadow-raised)', padding: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ ...captionStyle, fontWeight: 700, letterSpacing: '0.08em', color: T.brandText }}>{page.kicker}</div>
              <div style={{ ...bodyStyle, fontWeight: 700, marginTop: 8, lineHeight: 1.25 }}>{page.title}</div>
              <div style={{ marginTop: 8, ...captionStyle, color: T.subtle, lineHeight: 1.6, overflow: 'auto' }}>{page.body}</div>
              <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between', ...captionStyle }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stamp}</span>
                <span style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {govError ? (
        <div style={{ marginTop: 16 }}>
          <SectionMessage appearance="error" title="Governance action rejected by the database">
            <p style={{ whiteSpace: 'pre-wrap' }}>{govError}</p>
          </SectionMessage>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <PackVersionsSection snapshotId={snapshot.id} snapshotStatus={snapshot.status} onError={setGovError} />
      </div>
    </StrataPageShell>
  );
}
