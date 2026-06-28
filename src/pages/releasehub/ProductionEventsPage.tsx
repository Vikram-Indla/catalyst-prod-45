/**
 * Release Operations — Production Events (route /release-hub/production-events)
 *
 * Phase 10: JiraTable list of rh_production_events + a detail modal with the
 * immutable deployment snapshots. Events auto-generate when a production-
 * targeted release reaches `completed` (see useUpdateReleaseStatus).
 */
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import Modal, { ModalBody, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { Clock } from '@/lib/atlaskit-icons';
import { useProductionEventsList, type ProductionEventRow } from '@/hooks/useReleaseHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
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

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span style={{ color: T.subtlest }}>—</span>;
  const norm = result.toLowerCase();
  const map: Record<string, { fg: string; bg: string }> = {
    success: { fg: 'var(--ds-text-success)', bg: 'var(--ds-background-success)' },
    partial: { fg: 'var(--ds-text-warning)', bg: 'var(--ds-background-warning)' },
    failed: { fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
    rolled_back: { fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
  };
  const m = map[norm] ?? { fg: T.subtle, bg: T.sunken };
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{result.replace(/_/g, ' ')}</span>;
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
  const [selected, setSelected] = useState<ProductionEventRow | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const columns: Column<ProductionEventRow>[] = useMemo(() => [
    {
      id: 'title', label: 'Event', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
    { id: 'deployedBy', label: 'By', width: 14, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.deployedBy}</span> },
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
          onRowClick={(r) => setSelected(r)}
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
