/**
 * WorkloadDrawer — Assigned items with parent hierarchy + sibling discovery
 */
import { useEffect } from 'react';
import { X, User } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PersonAvatar from './PersonAvatar';
import { useAssignedItems } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

export default function WorkloadDrawer() {
  const { activeDrawer, drawerPayload, closeDrawer, selectedReleaseIds } = useDashboardStore();
  const open = activeDrawer === 'workload';
  const { data, isLoading } = useAssignedItems(open ? drawerPayload.userId : undefined, selectedReleaseIds);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, closeDrawer]);

  if (!open) return null;
  const items = data ?? [];
  const name = drawerPayload.userName || 'Team Member';

  return (
    <>
      <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.15)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, background: '#FFFFFF', zIndex: 201, boxShadow: '-4px 0 24px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="#2563EB" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
              {name} — Assigned Items
            </span>
          </div>
          <button onClick={closeDrawer} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#94A3B8" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', padding: 40 }}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', padding: 40 }}>No assigned items</div>
          ) : (
            items.map((item: any) => (
              <div key={item.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#2563EB' }}>{item.item_key}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 4, background: item.item_type === 'bug' ? '#FEF2F2' : '#EFF6FF', color: item.item_type === 'bug' ? '#DC2626' : '#2563EB' }}>
                      {item.item_type}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{item.displayTitle}</div>

                {/* Parent hierarchy */}
                {item.parent && (
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                    Parent: <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.parent.item_type}</span>: {item.parent.item_key} — {item.parent.title}
                  </div>
                )}

                {/* Assigned metadata */}
                {item.assigned_at && (
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                    Assigned: {format(new Date(item.assigned_at), 'MMM d')}{item.assigned_by_name ? ` by ${item.assigned_by_name}` : ''}
                  </div>
                )}

                {/* Sibling discovery */}
                {item.siblings && item.siblings.length > 0 && (
                  <div style={{ marginTop: 8, background: '#FEFCE8', border: '1px solid #FEF08A', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>Working with (same parent):</div>
                    {item.siblings.map((sib: any) => (
                      <div
                        key={sib.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
                          borderLeft: sib.assignee_id === drawerPayload.userId ? '2px solid #2563EB' : '2px solid transparent',
                          paddingLeft: 6,
                        }}
                      >
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#2563EB', fontWeight: 600 }}>{sib.item_key}</span>
                        <span style={{ fontSize: 10, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sib.displayTitle}</span>
                        {sib.assignee_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <PersonAvatar name={sib.assignee_name} size={14} />
                            <span style={{ fontSize: 9, color: '#64748B' }}>
                              {sib.assignee_id === drawerPayload.userId ? 'me' : sib.assignee_name.split(' ')[0]}
                            </span>
                          </div>
                        )}
                        <StatusBadge status={sib.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
