/**
 * TimeInStatus — The Gold Widget
 * Per-ticket lifecycle with sticky columns, hover tooltips, bottleneck detection
 * Abbreviated column headers, micro-card cells, release column
 */
import { useState } from 'react';
import WidgetCard from './WidgetCard';
import StatusBadge, { getStatusColor, getStatusCellBg } from './StatusBadge';
import { TypeBadge } from './TypeBadge';
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

const TIS_ABBREV: Record<string, string> = {
  'in_requirements': 'REQ',
  'in_design': 'DESIGN',
  'ready_for_development': 'READY',
  'in_development': 'DEV',
  'in_qa': 'QA',
  'in_uat': 'UAT',
  'in_beta': 'BETA',
  'production_ready': 'PROD R.',
  'in_production': 'PROD',
  'on_hold': 'HOLD',
  'in_entity_integration': 'INTEG',
  'technical_validation': 'VALID',
  'end_to_end_testing': 'E2E',
};

function formatDuration(days: number): string {
  if (days === 0) return '0d';
  if (days < 1) return '< 1d';
  return `${Math.round(days)}d`;
}

function getDaysColor(days: number): string {
  if (days <= 1) return 'var(--sem-success-fg)';
  if (days <= 4) return 'var(--sem-warning-fg)';
  return 'var(--sem-danger)';
}

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

  // Fixed column count: Release + Key + Type + Title + Current = 5 sticky
  const stickyColWidths = [60, 70, 55, 130, 100]; // approximate

  return (
    <WidgetCard title="Time in Status" subtitle="Per-ticket lifecycle · Hover cells for details" error={error ? error.message : null} onRetry={() => refetch()}>
      {isLoading ? (
        <WidgetSkeleton rows={5} />
      ) : allItems.length === 0 ? (
        <EmptyState message="No lifecycle data available for selected releases" icon="info" />
      ) : (
        <div className="ph-tis-scroll" style={{ position: 'relative', maxHeight: 440, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
            <thead className="bg-[var(--bg-app)] dark:bg-[#0A0A0A]" style={{ position: 'sticky', top: 0, zIndex: 4 }}>
              <tr style={{ borderBottom: '2px solid var(--divider)' }}>
                {['Release', 'Key', 'Type', 'Title', 'Current'].map((h, i) => (
                  <th key={h} className="bg-[var(--bg-app)] dark:bg-[#0A0A0A]" style={{
                    padding: '8px 8px', textAlign: 'left',
                    fontSize: 10, fontWeight: 700, color: 'var(--fg-2)',
                    textTransform: 'uppercase', letterSpacing: '.08em',
                    fontFamily: "'Inter', sans-serif",
                    position: 'sticky', left: i === 0 ? 0 : undefined,
                    zIndex: 5, whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
                {visibleStatuses.map(s => (
                  <th key={s} style={{
                    padding: '8px 4px', textAlign: 'center',
                    fontSize: 9, fontWeight: 700, color: 'var(--fg-2)',
                    textTransform: 'uppercase', letterSpacing: '.1em',
                    whiteSpace: 'nowrap', minWidth: 72,
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {TIS_ABBREV[s] || s.replace(/_/g, ' ').slice(0, 6).toUpperCase()}
                  </th>
                ))}
                <th className="bg-[var(--bg-1)] dark:bg-[#1A1A1A]" style={{
                  padding: '8px 12px', textAlign: 'right',
                  fontSize: 10, fontWeight: 700, color: 'var(--fg-2)',
                  textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
                  borderLeft: '2px solid var(--divider)',
                  position: 'sticky', right: 0, zIndex: 5,
                  boxShadow: '-4px 0 8px rgba(0,0,0,0.06)',
                }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item: any, idx: number) => {
                const statusMap: Record<string, any> = {};
                for (const s of item.statuses ?? []) {
                  statusMap[s.status] = s;
                }
                const rowBgClass = idx % 2 === 1 ? 'bg-[var(--bg-1)] dark:bg-[#1A1A1A]' : 'bg-[var(--bg-app)] dark:bg-[#0A0A0A]';
                return (
                  <tr key={item.work_item_id} className={`ph-table-row ${rowBgClass}`} style={{ height: 44, borderBottom: '1px solid var(--cp-bd-zone)' }}>
                    {/* Release */}
                    <td className={rowBgClass} style={{ padding: '0 8px', position: 'sticky', left: 0, zIndex: 1 }}>
                      <span className="bg-[var(--sem-success-bg)]" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, color: 'var(--sem-success-fg)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--sem-success-accent)' }}>
                        {releaseMap[item.release_key] || '—'}
                      </span>
                    </td>
                    {/* Key */}
                    <td className={rowBgClass} style={{ padding: '0 8px' }}>
                      <button onClick={() => openLifecycle(item.work_item_id)} className="ph-focus-ring" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--cp-primary-70)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                        {item.work_item_key}
                      </button>
                    </td>
                    {/* Type */}
                    <td style={{ padding: '0 8px' }}>
                      <TypeBadge type={item.work_item_type} />
                    </td>
                    {/* Title */}
                    <td style={{ padding: '0 8px', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-1)', fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif" }} title={item.work_item_title}>
                      {item.work_item_title}
                    </td>
                    {/* Current Status */}
                    <td style={{ padding: '0 8px' }}><StatusBadge status={item.current_status} /></td>
                    {/* Status columns */}
                    {visibleStatuses.map(status => {
                      const entry = statusMap[status];
                      const isCurrent = item.current_status === status;
                      const bn = entry && isBottleneck(status, entry.duration_days);
                      const days = entry ? Math.round(entry.duration_days) : 0;
                      return (
                        <td
                          key={status}
                          style={{ padding: '3px 3px', textAlign: 'center', verticalAlign: 'middle' }}
                          onMouseEnter={(e) => {
                            if (!entry) return;
                            const r = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip({
                              x: r.left + r.width / 2,
                              y: r.top - 8,
                              text: `Entered: ${entry.entered_at ? format(new Date(entry.entered_at), 'MMM d, yyyy') : '—'} · Duration: ${formatDuration(entry.duration_days)} · Changed by: ${entry.changed_by || 'System'}`,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {entry ? (
                            <div style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              padding: '3px 2px', borderRadius: 6, minHeight: 40,
                              background: bn ? 'var(--sem-warning-bg)' : getStatusCellBg(status),
                              border: bn ? '1px solid #FDE68A' : undefined,
                              outline: isCurrent ? '2px solid var(--cp-blue)' : undefined,
                              outlineOffset: isCurrent ? -1 : undefined,
                              position: 'relative',
                            }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--fg-2)' }}>
                                {entry.entered_at ? format(new Date(entry.entered_at), 'MMM d') : ''}
                              </span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: bn ? 12 : 11, fontWeight: 800, color: bn ? 'var(--sem-warning-fg)' : getDaysColor(days) }}>
                                {formatDuration(entry.duration_days)}
                              </span>
                              {isCurrent && (
                                <span className="ph-pulse-dot bg-[var(--cp-blue)]" style={{
                                  position: 'absolute', top: 3, right: 3,
                                  width: 5, height: 5, borderRadius: '50%',
                                }} />
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--divider)', fontSize: 10 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    {/* Total */}
                    <td className={idx % 2 === 1 ? 'bg-[var(--cp-bd-zone)] dark:bg-[#1A1A1A]' : 'bg-[var(--bg-1)] dark:bg-[#1A1A1A]'} style={{
                      padding: '8px 12px', textAlign: 'right',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: 'var(--fg-1)',
                      borderLeft: '2px solid var(--divider)',
                      position: 'sticky', right: 0, zIndex: 2,
                      boxShadow: '-4px 0 8px rgba(0,0,0,0.06)',
                    }}>
                      {Math.round(item.total_cycle_days)}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Show all toggle */}
          {allItems.length > INITIAL_SHOW && !showAll && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--cp-bd-zone)', textAlign: 'center' }}>
              <button onClick={() => setShowAll(true)} className="ph-focus-ring" style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Show all {allItems.length} items
              </button>
            </div>
          )}
          {showAll && allItems.length > INITIAL_SHOW && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--cp-bd-zone)', textAlign: 'center' }}>
              <button onClick={() => setShowAll(false)} className="ph-focus-ring" style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Show less
              </button>
            </div>
          )}

          {/* Tooltip */}
          {tooltip && (
            <div className="bg-[var(--fg-1)]" style={{
              position: 'fixed', left: tooltip.x, top: tooltip.y,
              transform: 'translate(-50%, -100%)',
              color: 'var(--bg-1)', fontSize: 10, padding: '6px 10px',
              borderRadius: 6, whiteSpace: 'nowrap', zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,.2)',
              pointerEvents: 'none', fontFamily: "'Inter', sans-serif",
            }}>
              {tooltip.text}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
