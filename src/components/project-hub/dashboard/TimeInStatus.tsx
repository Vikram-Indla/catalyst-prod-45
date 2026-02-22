/**
 * TimeInStatus — The Gold Widget
 * Per-ticket lifecycle with sticky columns, hover tooltips, bottleneck detection
 * Includes "Show all" for 15+ items
 */
import { useState } from 'react';
import WidgetCard from './WidgetCard';
import StatusBadge, { getStatusColor, getStatusCellBg } from './StatusBadge';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useTimeInStatus, useTisConfig } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

const DEFAULT_STATUSES = [
  'in_requirements', 'in_design', 'ready_for_development', 'in_development',
  'in_qa', 'in_uat', 'in_beta', 'production_ready', 'in_production',
];
const INITIAL_SHOW = 10;

function formatLabel(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

export default function TimeInStatus({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading, error, refetch } = useTimeInStatus(projectId, selectedReleaseIds);
  const { data: tisConfig } = useTisConfig(projectId);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleStatuses: string[] = (tisConfig?.visible_statuses as string[]) ?? DEFAULT_STATUSES;
  const allItems = data ?? [];
  const displayItems = showAll ? allItems : allItems.slice(0, INITIAL_SHOW);

  const isBottleneck = (status: string, days: number): boolean => {
    const color = getStatusColor(status);
    return color === 'blue' && days > 5;
  };

  return (
    <WidgetCard title="Time in Status" subtitle="Per-ticket lifecycle · Hover cells for details" error={error ? error.message : null} onRetry={() => refetch()}>
      {isLoading ? (
        <WidgetSkeleton rows={5} />
      ) : allItems.length === 0 ? (
        <EmptyState message="No lifecycle data available for selected releases" icon="info" />
      ) : (
        <div className="ph-tis-scroll" style={{ position: 'relative', maxHeight: 440, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#FFFFFF' }}>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                {['Key', 'Type', 'Title', 'Current'].map(h => (
                  <th key={h} style={{ padding: '8px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: "'Inter', sans-serif", position: 'sticky', left: h === 'Key' ? 0 : undefined, background: '#FFFFFF', zIndex: 3, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
                {visibleStatuses.map(s => (
                  <th key={s} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.02em', whiteSpace: 'nowrap', minWidth: 64, fontFamily: "'Inter', sans-serif" }}>
                    {formatLabel(s).slice(0, 12)}
                  </th>
                ))}
                <th style={{ padding: '8px 8px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item: any, idx: number) => {
                const statusMap: Record<string, any> = {};
                for (const s of item.statuses ?? []) {
                  statusMap[s.status] = s;
                }
                return (
                  <tr key={item.work_item_id} style={{ height: 44, borderBottom: '1px solid #F8FAFC', background: idx % 2 === 1 ? '#FAFBFC' : undefined }}>
                    <td style={{ padding: '0 8px', position: 'sticky', left: 0, background: idx % 2 === 1 ? '#FAFBFC' : '#FFFFFF', zIndex: 1 }}>
                      <button onClick={() => openLifecycle(item.work_item_id)} className="ph-focus-ring" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                        {item.work_item_key}
                      </button>
                    </td>
                    <td style={{ padding: '0 8px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 4, background: item.work_item_type === 'bug' ? '#FEF2F2' : '#EFF6FF', color: item.work_item_type === 'bug' ? '#DC2626' : '#2563EB' }}>
                        {item.work_item_type === 'bug' ? 'Bug' : 'Story'}
                      </span>
                    </td>
                    <td style={{ padding: '0 8px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155', fontSize: 11, fontFamily: "'Inter', sans-serif" }} title={item.work_item_title}>
                      {item.work_item_title}
                    </td>
                    <td style={{ padding: '0 8px' }}><StatusBadge status={item.current_status} /></td>
                    {visibleStatuses.map(status => {
                      const entry = statusMap[status];
                      const isCurrent = item.current_status === status;
                      const bn = entry && isBottleneck(status, entry.duration_days);
                      return (
                        <td
                          key={status}
                          style={{
                            padding: '4px 4px', textAlign: 'center',
                            background: bn ? '#FFFBEB' : getStatusCellBg(status),
                            outline: isCurrent ? '2px solid #2563EB' : undefined,
                            outlineOffset: isCurrent ? -2 : undefined,
                            position: 'relative', cursor: entry ? 'default' : undefined,
                            transition: 'background 120ms ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!entry) return;
                            const r = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip({
                              x: r.left + r.width / 2,
                              y: r.top - 8,
                              text: `Entered: ${entry.entered_at ? format(new Date(entry.entered_at), 'MMM d, yyyy') : '—'} · Duration: ${entry.duration_days}d · Changed by: ${entry.changed_by || 'System'}`,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {entry ? (
                            <div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: '#64748B' }}>
                                {entry.entered_at ? format(new Date(entry.entered_at), 'MMM d') : ''}
                              </div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: bn ? '#D97706' : entry.duration_days === 0 ? '#16A34A' : entry.duration_days > 5 ? '#EF4444' : entry.duration_days > 2 ? '#D97706' : '#16A34A' }}>
                                {entry.duration_days}d
                              </div>
                              {isCurrent && (
                                <span className="ph-pulse-dot" style={{
                                  position: 'absolute', top: 4, right: 4,
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: '#2563EB',
                                }} />
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: '0 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
                      {item.total_cycle_days}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Show all toggle */}
          {allItems.length > INITIAL_SHOW && !showAll && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <button
                onClick={() => setShowAll(true)}
                className="ph-focus-ring"
                style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Show all {allItems.length} items
              </button>
            </div>
          )}
          {showAll && allItems.length > INITIAL_SHOW && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <button
                onClick={() => setShowAll(false)}
                className="ph-focus-ring"
                style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Show less
              </button>
            </div>
          )}

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'fixed', left: tooltip.x, top: tooltip.y,
              transform: 'translate(-50%, -100%)',
              background: '#1E293B', color: '#F8FAFC', fontSize: 10, padding: '6px 10px',
              borderRadius: 6, whiteSpace: 'nowrap', zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,.2)',
              pointerEvents: 'none', fontFamily: "'Inter', sans-serif",
            }}>
              {tooltip.text}
            </div>
          )}
        </div>
      )}

      {/* pulse animation is in dashboardPolish.css */}
    </WidgetCard>
  );
}
