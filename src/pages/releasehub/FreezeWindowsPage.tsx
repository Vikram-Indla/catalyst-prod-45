/**
 * Release Operations — Freeze Windows (route /release-hub/freeze-windows)
 *
 * Phase 13: JiraTable list of rh_freeze_windows with conflict detection (count
 * of active releases/changes scheduled inside each window, matching env), a
 * Create modal, and per-row delete. Conflict counts surface where a freeze is
 * being violated by scheduled work.
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarOff, Plus, Trash2 } from '@/lib/atlaskit-icons';
import { useFreezeWindowsList, useDeleteFreezeWindow, type FreezeWindowRow } from '@/hooks/useReleaseHub';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateFreezeWindowModal } from '@/components/releasehub/CreateFreezeWindowModal';
import { catalystToast } from '@/lib/catalystToast';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import { RH } from '@/constants/releasehub.design';
import { ChangeStatusLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import { Lozenge } from '@/components/ads/Lozenge';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { AtlaskitPageShell } from '@/components/ads';
import { useReleaseOpsPermissions, PERMISSION_DENIED_TOOLTIP } from '@/hooks/useReleaseOpsPermissions';

const T = {
  surface: 'var(--ds-surface)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  danger: 'var(--ds-text-danger)',
  dangerBg: 'var(--ds-background-danger)',
};

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

/** Artifact card layout: icon · name + status + conflict pill · reason · date range + env. */
function FreezeCard({ w, canManage, onDelete }: { w: FreezeWindowRow; canManage: boolean; onDelete: () => void }) {
  const conflict = w.conflicts > 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 8,
      background: conflict ? T.dangerBg : T.surface,
      border: `1px solid ${conflict ? 'var(--ds-border-danger)' : T.border}`,
    }}>
      <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.dangerBg }}>
        <CalendarOff size={20} style={{ color: T.danger }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>{w.name}</span>
          <ChangeStatusLozenge status={w.status} />
          {conflict && (
            <Lozenge appearance="removed">
              {`Conflict${w.conflicts > 1 ? ` ×${w.conflicts}` : ''}`}
            </Lozenge>
          )}
        </div>
        {w.reason && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, marginTop: 4 }}>{w.reason}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text }}>{format(new Date(w.startDate), 'MMM d')} – {format(new Date(w.endDate), 'MMM d, yyyy')}</div>
        <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, marginTop: 4 }}>{titleCase(w.targetEnv)}</div>
      </div>
      {canManage && (
        <button onClick={onDelete} aria-label="Delete freeze window" style={{ display: 'flex', flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: T.subtlest, padding: 4 }}>
          <Trash2 size={14} style={{ color: T.subtlest }} />
        </button>
      )}
    </div>
  );
}

export default function FreezeWindowsPage() {
  const { data: windows = [], isLoading, error, refetch } = useFreezeWindowsList();
  const del = useDeleteFreezeWindow();
  const [showCreate, setShowCreate] = useState(false);
  const { canManage } = useReleaseOpsPermissions();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => catalystToast.success('Freeze window deleted'),
      onError: () => catalystToast.error('Failed to delete'),
    });
    setDeleteTarget(null);
  };

  return (
    <AtlaskitPageShell flush chromeBand={<ProjectPageHeader projectKey="RELEASES" hubType="release" />} testId="release-ops-freeze-windows">
      <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => canManage && setShowCreate(true)}
          disabled={!canManage}
          title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP}
          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}
        >
          <Plus size={14} style={{ color: 'var(--ds-text-inverse)' }} /> New freeze window
        </button>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !isLoading && windows.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No freeze windows yet" subtitle="Freeze windows block deployments during sensitive periods like year-end or major events." actions={[{ label: '+ New freeze window', onClick: () => setShowCreate(true), variant: 'primary' }]} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {windows.map((w) => (
            <FreezeCard key={w.id} w={w} canManage={canManage} onDelete={() => handleDelete(w.id, w.name)} />
          ))}
        </div>
      )}

      {showCreate && <CreateFreezeWindowModal onClose={() => setShowCreate(false)} />}

      {deleteTarget && (
        <ConfirmDeleteDialog
          isOpen
          onClose={() => setDeleteTarget(null)}
          issueKey={deleteTarget.name}
          issueSummary=""
          typeLabel="freeze window"
          onConfirm={handleDeleteConfirm}
        />
      )}
      </div>
    </AtlaskitPageShell>
  );
}
