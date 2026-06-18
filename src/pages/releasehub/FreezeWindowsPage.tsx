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
import { CalendarOff, Plus, Trash2, AlertTriangle } from '@/lib/atlaskit-icons';
import { useFreezeWindowsList, useDeleteFreezeWindow, type FreezeWindowRow } from '@/hooks/useReleaseHub';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateFreezeWindowModal } from '@/components/releasehub/CreateFreezeWindowModal';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';
import { useReleaseOpsPermissions, PERMISSION_DENIED_TOOLTIP } from '@/hooks/useReleaseOpsPermissions';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  danger: 'var(--ds-text-danger, #AE2A19)',
  dangerBg: 'var(--ds-background-danger, #FFECEB)',
};

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

/** Freeze status pill — active=blue, scheduled/ended=neutral (3-colour guardrail). */
function StatusPill({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span style={{
      fontFamily: RH.fontBody, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
      padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap',
      color: active ? 'var(--ds-text-information, #0055CC)' : T.subtle,
      background: active ? 'var(--ds-background-information, #E9F2FE)' : 'var(--ds-background-neutral, #F1F2F4)',
    }}>{status.toUpperCase()}</span>
  );
}

/** Artifact card layout: icon · name + status + conflict pill · reason · date range + env. */
function FreezeCard({ w, canManage, onDelete }: { w: FreezeWindowRow; canManage: boolean; onDelete: () => void }) {
  const conflict = w.conflicts > 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 8,
      background: conflict ? T.dangerBg : T.surface,
      border: `1px solid ${conflict ? 'var(--ds-border-danger, #E2483D)' : T.border}`,
    }}>
      <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.dangerBg }}>
        <CalendarOff size={20} style={{ color: T.danger }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text }}>{w.name}</span>
          <StatusPill status={w.status} />
          {conflict && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: T.danger, background: T.dangerBg, border: `1px solid var(--ds-border-danger, #E2483D)`, padding: '0 8px', borderRadius: 3 }}>
              <AlertTriangle size={12} style={{ color: T.danger }} /> CONFLICT{w.conflicts > 1 ? ` ×${w.conflicts}` : ''}
            </span>
          )}
        </div>
        {w.reason && <div style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, marginTop: 4 }}>{w.reason}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.text }}>{format(new Date(w.startDate), 'MMM d')} – {format(new Date(w.endDate), 'MMM d, yyyy')}</div>
        <div style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, marginTop: 4 }}>{titleCase(w.targetEnv)}</div>
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

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete freeze window "${name}"?`)) return;
    del.mutate(id, {
      onSuccess: () => catalystToast.success('Freeze window deleted'),
      onError: () => catalystToast.error('Failed to delete'),
    });
  };

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>Freeze Windows</h1>
          <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, margin: '4px 0 0' }}>Periods when deployments are blocked</p>
        </div>
        <button
          onClick={() => canManage && setShowCreate(true)}
          disabled={!canManage}
          title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP}
          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, background: 'var(--ds-background-brand-bold, #0C66E4)', color: 'var(--ds-text-inverse, #FFFFFF)', fontFamily: RH.fontBody, fontSize: 14, fontWeight: 500 }}
        >
          <Plus size={14} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} /> New freeze window
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
    </div>
  );
}
