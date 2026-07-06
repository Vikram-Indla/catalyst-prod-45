/**
 * ChangeExecutionBoard — Phase 6 §8/§9. Release-Ops board defaulting to the
 * change lifecycle. Lanes = CHANGE_STAGES + Failed/Rolled-back + Cancelled.
 * Rich cards (release/env/risk/SOP/sign-off/markers) route to full Change
 * Detail. Drag validates via useUpdateChangeStatus (validateChangeTransition);
 * invalid drops are rejected with a toast; terminal lanes require a reason.
 * Atlaskit Pragmatic DnD, ADS tokens, no drawers.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Button from '@atlaskit/button';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useChangesList, useUpdateChangeStatus, type ChangeListRow } from '@/hooks/useReleaseHub';
import { CHANGE_STAGES } from '@/lib/release-ops/lifecycle';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ads/Modal';
import TextArea from '@atlaskit/textarea';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { useReleaseOpsPermissions } from '@/hooks/useReleaseOpsPermissions';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { Package } from '@/lib/atlaskit-icons';

const T = {
  surface: 'var(--ds-surface)', card: 'var(--ds-surface-raised)', sunken: 'var(--ds-surface-sunken)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)', warning: 'var(--ds-text-warning)', success: 'var(--ds-text-success)', mono: 'var(--ds-font-family-code, monospace)',
};

const CHANGE_ALIAS: Record<string, string> = { new: 'draft', in_uat: 'implementing', in_beta: 'validating', in_production: 'implemented', done: 'closed' };
const TERMINAL_FAIL = ['failed', 'rolled_back'];
const LANES: Array<{ id: string; label: string; statuses?: string[] }> = [
  ...CHANGE_STAGES.map((s) => ({ id: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) })),
  { id: 'failed', label: 'Failed / Rolled back', statuses: TERMINAL_FAIL },
  { id: 'cancelled', label: 'Cancelled' },
];
const REASON_REQUIRED = new Set(['failed', 'rolled_back', 'cancelled']);

function laneOf(status: string): string {
  if (TERMINAL_FAIL.includes(status)) return 'failed';
  if (status === 'cancelled') return 'cancelled';
  const canon = CHANGE_ALIAS[status] ?? status;
  return CHANGE_STAGES.includes(canon) ? canon : 'draft';
}
const titleCase = (v: string | null) => (!v ? '—' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));

function Marker({ label, tone, bg }: { label: string; tone: string; bg: string }) {
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: tone, background: bg, padding: '0px 5px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>{label}</span>;
}

function Card({ row }: { row: ChangeListRow }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    return draggable({ element: el, getInitialData: () => ({ type: 'chg-card', changeId: row.id, fromStatus: row.status }), onDragStart: () => setDragging(true), onDrop: () => setDragging(false) });
  }, [row.id, row.status]);

  const highRisk = row.risk_level === 'high' || row.risk_level === 'critical';
  return (
    <div ref={ref} onClick={() => navigate(`/release-hub/changes/${row.slug ?? row.id}`)}
      style={{ background: T.card, border: `1px solid ${highRisk ? 'var(--ds-border-danger)' : T.border}`, borderRadius: 8, padding: 10, cursor: 'pointer', opacity: dragging ? 0.4 : 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.link }}>{row.chg_number}</span>
        {row.risk_level && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: highRisk ? T.danger : T.subtle, textTransform: 'uppercase' }}>{row.risk_level}</span>}
        {row.target_env && <span style={{ marginLeft: 'auto', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtle }}>{row.target_env}</span>}
      </div>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, lineHeight: 1.3 }}>{row.title}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {row.isUnlinkedProduction && <Marker label="Unlinked prod" tone="var(--ds-text-danger)" bg="var(--ds-background-danger)" />}
        {row.isEmergency && <Marker label="Emergency" tone="var(--ds-text-warning)" bg="var(--ds-background-warning)" />}
      </div>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
        {row.releaseCount === 0 ? (row.target_env === 'production' ? 'No release' : 'Unassigned') : row.releaseCount === 1 ? (row.releaseName ?? '1 release') : `${row.releaseCount} releases`}
        {row.planned_start_at ? ` · ${format(new Date(row.planned_start_at), 'MMM d HH:mm')}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 10, fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
        {row.sopProgress && <span>SOP {row.sopProgress.done}/{row.sopProgress.total}</span>}
        {row.apprProgress && <span>Appr {row.apprProgress.approved}/{row.apprProgress.total}</span>}
      </div>
    </div>
  );
}

function Lane({ lane, rows }: { lane: typeof LANES[number]; rows: ChangeListRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    return dropTargetForElements({ element: el, getData: () => ({ laneId: lane.id }), canDrop: ({ source }) => source.data?.type === 'chg-card', onDragEnter: () => setOver(true), onDragLeave: () => setOver(false), onDrop: () => setOver(false) });
  }, [lane.id]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 240, width: 240, flex: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
        <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.text, textTransform: 'uppercase', letterSpacing: '.04em' }}>{lane.label}</span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, background: T.sunken, borderRadius: 10, padding: '0 6px' }}>{rows.length}</span>
      </div>
      <div ref={ref} style={{ background: over ? 'var(--ds-background-selected)' : T.sunken, border: `1px solid ${over ? 'var(--ds-border-focused)' : 'transparent'}`, borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120, flex: 1 }}>
        {rows.length === 0
          ? <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, textAlign: 'center', padding: '16px 8px' }}>No changes in this stage.</div>
          : rows.map((r) => <Card key={r.id} row={r} />)}
      </div>
    </div>
  );
}

export default function ChangeExecutionBoard() {
  const { data: changes = [], isLoading, error, refetch } = useChangesList();
  const updateStatus = useUpdateChangeStatus();
  const { canManage } = useReleaseOpsPermissions();
  const [pendingTerminal, setPendingTerminal] = useState<{ id: string; chg: string; laneId: string } | null>(null);
  const [reason, setReason] = useState('');

  const byLane = useMemo(() => {
    const map: Record<string, ChangeListRow[]> = {};
    LANES.forEach((l) => { map[l.id] = []; });
    changes.forEach((c) => { (map[laneOf(c.status)] ??= []).push(c); });
    return map;
  }, [changes]);

  const commit = (id: string, status: string, comment?: string) =>
    updateStatus.mutate({ id, status, comment }, {
      onSuccess: () => catalystToast.success(`Moved to ${titleCase(status)}`),
      onError: (e: any) => catalystToast.error(e?.message ?? 'Transition not allowed'),
    });

  useEffect(() => {
    if (!canManage) return;
    return monitorForElements({
      canMonitor: ({ source }) => source.data?.type === 'chg-card',
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target) return;
        const laneId = target.data?.laneId as string;
        const changeId = source.data?.changeId as string;
        const fromStatus = source.data?.fromStatus as string;
        if (!laneId || !changeId || laneOf(fromStatus) === laneId) return;
        const row = changes.find((c) => c.id === changeId);
        if (REASON_REQUIRED.has(laneId)) { setReason(''); setPendingTerminal({ id: changeId, chg: row?.chg_number ?? '', laneId: laneId === 'failed' ? 'failed' : 'cancelled' }); return; }
        commit(changeId, laneId);
      },
    });
  }, [canManage, changes]);

  if (error) return <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></div>;

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ margin: '-24px -24px 0' }}><ProjectPageHeader projectKey="RELEASES" hubType="release" /></div>
      <div style={{ padding: '12px 0' }}>
        <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, margin: 0 }}>Change execution board</h1>
        <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, margin: '0px 0 0' }}>{canManage ? 'Drag a card to move it through the lifecycle — invalid transitions are rejected.' : 'Read-only — you do not have permission to move changes.'}</p>
      </div>
      {!isLoading && changes.length === 0 ? (
        <EmptyState icon={Package} title="No change records" subtitle="Change records appear here grouped by lifecycle stage. Create a change to start managing deployments on the board." />
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, flex: 1 }}>
          {LANES.map((lane) => <Lane key={lane.id} lane={lane} rows={byLane[lane.id] ?? []} />)}
        </div>
      )}

      {pendingTerminal && (
        <Modal isOpen onClose={() => setPendingTerminal(null)} width="small" aria-label="Reason required">
          <ModalHeader><ModalTitle>{pendingTerminal.laneId === 'failed' ? 'Mark failed / rolled back' : 'Cancel change'} — {pendingTerminal.chg}</ModalTitle></ModalHeader>
          <ModalBody>
            <label style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>Reason <span style={{ color: T.danger }}>*</span></label>
            <TextArea value={reason} onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)} placeholder="Why is this change failing / being cancelled?" minimumRows={3} />
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setPendingTerminal(null)}>Cancel</Button>
            <Button appearance="warning" isDisabled={!reason.trim()} onClick={() => { commit(pendingTerminal.id, pendingTerminal.laneId === 'failed' ? 'failed' : 'cancelled', reason.trim()); setPendingTerminal(null); }}>Confirm</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
