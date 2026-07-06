/**
 * Release Operations — Production Events (route /release-hub/production-events)
 *
 * Phase 10: JiraTable list of rh_production_events + a detail modal with the
 * immutable deployment snapshots. Events auto-generate when a production-
 * targeted release reaches `completed` (see useUpdateReleaseStatus).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Modal, { ModalBody, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { Clock } from '@/lib/atlaskit-icons';
import { useProductionEventsList, type ProductionEventRow } from '@/hooks/useReleaseHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Lozenge } from '@/components/ads';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

const T = {
  surface: 'var(--ds-surface)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  mono: 'var(--ds-font-family-code, monospace)',
};

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

/** Canonical @atlaskit/lozenge — replaces a hand-rolled pill whose rendering
 *  depended on DB casing (mixed "Success" and "SUCCESS" styles in one column). */
function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span style={{ color: T.subtlest }}>—</span>;
  const norm = result.toLowerCase().replace(/ /g, '_');
  const appearance: React.ComponentProps<typeof Lozenge>['appearance'] =
    norm === 'success' ? 'success'
    : norm === 'partial' ? 'moved'
    : norm === 'failed' || norm === 'rolled_back' || norm === 'rollback' ? 'removed'
    : norm === 'in_progress' ? 'inprogress'
    : 'default';
  return <Lozenge appearance={appearance}>{result.replace(/_/g, ' ')}</Lozenge>;
}

function snapCount(snap: any): number | null {
  if (Array.isArray(snap)) return snap.length;
  if (snap && typeof snap === 'object') return Object.keys(snap).length;
  return null;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest, minWidth: 160 }}>{label}</span>
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text }}>{value ?? '—'}</span>
    </div>
  );
}

function EventDetailModal({ event, onClose }: { event: ProductionEventRow; onClose: () => void }) {
  return (
    <ModalTransition>
      <Modal onClose={onClose} width="medium">
        <ModalHeader hasCloseButton><ModalTitle>{event.title}</ModalTitle></ModalHeader>
        <ModalBody>
          <DetailRow label="Type" value={titleCase(event.eventType)} />
          <DetailRow label="Environment" value={titleCase(event.targetEnv)} />
          <DetailRow label="Result" value={<ResultBadge result={event.result ?? event.deploymentStatus} />} />
          <DetailRow label="Release" value={event.releaseKey ?? '—'} />
          <DetailRow label="Change" value={event.changeKey ?? '—'} />
          <DetailRow label="Deployed" value={event.deployedAt ? format(new Date(event.deployedAt), 'MMM d, yyyy HH:mm') : '—'} />
          <DetailRow label="Deployed by" value={event.deployedBy} />
          <DetailRow label="Duration" value={event.durationMinutes != null ? `${event.durationMinutes} min` : '—'} />
          <DetailRow label="Work items snapshot" value={snapCount(event.workItemsSnapshot) != null ? `${snapCount(event.workItemsSnapshot)} items` : '—'} />
          <DetailRow label="Business requests" value={snapCount(event.businessRequestsSnapshot) != null ? `${snapCount(event.businessRequestsSnapshot)} items` : '—'} />
          <DetailRow label="Commits" value={snapCount(event.commitsSnapshot) != null ? `${snapCount(event.commitsSnapshot)} commits` : '—'} />
          <DetailRow label="SOP evidence" value={snapCount(event.sopEvidenceSnapshot) != null ? `${snapCount(event.sopEvidenceSnapshot)} entries` : '—'} />
          <DetailRow label="Approvers" value={snapCount(event.approversSnapshot) != null ? `${snapCount(event.approversSnapshot)} approvers` : '—'} />
          {event.notes && <DetailRow label="Notes" value={event.notes} />}
        </ModalBody>
      </Modal>
    </ModalTransition>
  );
}

export default function ProductionEventsPage() {
  const { data: events = [], isLoading, error, refetch } = useProductionEventsList();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ProductionEventRow | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const openReplay = (r: ProductionEventRow) => navigate(`/release-hub/production-events/${r.eventKey ?? r.id}`);

  const columns: Column<ProductionEventRow>[] = useMemo(() => [
    {
      id: 'title', label: 'Event', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>{row.title}</span>
          {(row.releaseKey || row.changeKey) && <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{row.releaseKey ?? row.changeKey}</span>}
        </div>
      ),
    },
    { id: 'eventType', label: 'Type', width: 12, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.eventType)}</span> },
    { id: 'targetEnv', label: 'Env', width: 12, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.targetEnv)}</span> },
    { id: 'result', label: 'Result', width: 12, cell: ({ row }) => <ResultBadge result={row.result ?? row.deploymentStatus} /> },
    {
      id: 'deployedAt', label: 'Deployed', width: 16, sortable: true, accessor: (r) => r.deployedAt,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{row.deployedAt ? format(new Date(row.deployedAt), 'MMM d, yyyy HH:mm') : '—'}</span>,
    },
    { id: 'deployedBy', label: 'By', width: 12, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.deployedBy}</span> },
    { id: 'snap', label: 'Snapshot', width: 14, cell: ({ row }) => {
      const c = snapCount(row.commitsSnapshot), ev = snapCount(row.sopEvidenceSnapshot), ap = snapCount(row.approversSnapshot);
      return <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{c ?? 0}c · {ev ?? 0}e · {ap ?? 0}a</span>;
    } },
    { id: 'replay', label: 'Replay', width: 14, cell: ({ row }) => (
      <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openReplay(row)} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-link)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Replay →</button>
        <button onClick={() => setSelected(row)} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Preview</button>
      </div>
    ) },
  ], []);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ margin: '-24px -24px 16px' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !isLoading && events.length === 0 ? (
        <EmptyState icon={Clock} title="No production events yet" subtitle="A production event is recorded automatically when a production-targeted release completes." />
      ) : (
        <JiraTable<ProductionEventRow>
          columns={columns}
          data={events}
          getRowId={(r) => r.id}
          onRowClick={openReplay}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
          isLoading={isLoading}
          rowsPerPage={25}
          showRowCount
          totalRowCount={events.length}
          ariaLabel="Production events"
        />
      )}

      {selected && <EventDetailModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
