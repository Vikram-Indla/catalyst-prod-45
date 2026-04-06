/**
 * LifecycleDrawer — Vertical timeline for a work item's status transitions
 */
import { useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import StatusBadge, { getStatusColor } from './StatusBadge';
import { DrawerSkeleton } from './WidgetSkeleton';
import { useLifecycle } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

const DOT_COLORS: Record<string, string> = { gray: 'rgba(237,237,237,0.40)', blue: '#2563EB', green: '#16A34A' };

export default function LifecycleDrawer() {
  const { activeDrawer, drawerPayload, closeDrawer } = useDashboardStore();
  const open = activeDrawer === 'lifecycle';
  const { data, isLoading } = useLifecycle(open ? drawerPayload.workItemId : undefined);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, closeDrawer]);

  if (!open) return null;

  const transitions = data ?? [];
  let totalDays = 0;
  transitions.forEach((t: any, i: number) => {
    const next = transitions[i + 1];
    const start = new Date(t.changed_at).getTime();
    const end = next ? new Date(next.changed_at).getTime() : Date.now();
    totalDays += (end - start) / 86400000;
  });

  return (
    <>
      <div onClick={closeDrawer} className="ph-drawer-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.15)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div role="dialog" aria-label="Lifecycle Timeline" className="ph-drawer-panel bg-[var(--cp-float)] dark:bg-[#0A0A0A]" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, zIndex: 201, boxShadow: '-4px 0 24px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--cp-blue)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', fontFamily: "'Sora', sans-serif" }}>
              Lifecycle Timeline
            </span>
          </div>
          <button onClick={closeDrawer} aria-label="Close drawer" className="ph-focus-ring" style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--fg-4)" />
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--cp-bd-zone)', display: 'flex', gap: 8 }}>
          <span className="bg-[var(--cp-bd-zone)]" style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', padding: '3px 8px', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            Total cycle: {Math.round(totalDays)}d
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <DrawerSkeleton />
          ) : transitions.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-4)', padding: 40, fontFamily: "'Inter', sans-serif" }}>No transitions recorded</div>
          ) : (
            transitions.map((t: any, i: number) => {
              const color = getStatusColor(t.to_status);
              const dotColor = DOT_COLORS[color];
              const next = transitions[i + 1];
              const start = new Date(t.changed_at).getTime();
              const end = next ? new Date(next.changed_at).getTime() : Date.now();
              const dur = Math.round((end - start) / 86400000);
              return (
                <div key={t.id} style={{ display: 'flex', gap: 12, marginBottom: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 4 }} />
                    {i < transitions.length - 1 && <div className="bg-[var(--cp-bd-zone)]" style={{ width: 2, flex: 1, minHeight: 24 }} />}
                  </div>
                  <div style={{ paddingBottom: 16, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusBadge status={t.to_status} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: dur === 0 ? 'var(--sem-success)' : 'var(--fg-1)' }}>{dur}d</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                      {format(new Date(t.changed_at), 'MMM d, yyyy')} · Changed by {t.changed_by_name || 'System'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
