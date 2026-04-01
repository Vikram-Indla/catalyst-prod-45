/**
 * OverdueItems widget — color-coded late badges, capped rows
 */
import { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useOverdue } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

interface Props { projectId: string | null; releaseMap: Record<string, string>; }

const MAX_VISIBLE = 5;

export default function OverdueItems({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading, error, refetch } = useOverdue(projectId, selectedReleaseIds);
  const items = data ?? [];
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, MAX_VISIBLE);

  return (
    <WidgetCard title="Overdue" subtitle="Past due date" count={items.length} countColor="#D97706" maxHeight={320} error={error ? error.message : null} onRetry={() => refetch()}>
      {isLoading ? (
        <WidgetSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState message="All items on track — no overdue" icon="check" />
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ borderBottom: '2px solid var(--divider)' }}>{['Release', 'Key', 'Title', 'Due', 'Late', 'Assignee'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Inter', sans-serif" }}>{h}</th>)}</tr></thead>
            <tbody>{visible.map((item: any, idx: number) => (
              <tr key={item.id} style={{ height: 44, borderBottom: '1px solid var(--cp-bd-zone)', background: idx % 2 === 1 ? 'var(--bg-1)' : undefined }} className="ph-table-row">
                <td style={{ padding: '0 8px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, color: 'var(--sem-success-fg)', background: 'var(--sem-success-bg)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--sem-success-accent)' }}>{releaseMap[item.release_id] || '—'}</span>
                </td>
                <td style={{ padding: '0 8px' }}><button onClick={() => openLifecycle(item.id)} className="ph-focus-ring" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--cp-primary-70)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>{item.item_key}</button></td>
                <td style={{ padding: '0 8px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-1)', fontWeight: 500, fontFamily: "'Inter', sans-serif" }} title={item.displayTitle}>{item.displayTitle}</td>
                <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--fg-2)', fontWeight: 500 }}>{item.due_date ? format(new Date(item.due_date), 'MMM d') : '—'}</td>
                <td style={{ padding: '0 8px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 28, padding: '2px 6px', borderRadius: 9999,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                    color: '#FFFFFF',
                    background: item.days_overdue <= 3 ? 'var(--sem-warning)' : 'var(--sem-danger)',
                  }}>{item.days_overdue}d</span>
                </td>
                <td style={{ padding: '0 8px' }}>{item.assignee_name ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><PersonAvatar name={item.assignee_name} size={18} /><span style={{ fontSize: 11, color: 'var(--fg-1)', fontWeight: 500, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{item.assignee_name.split(' ')[0]}</span></div> : <span style={{ color: 'var(--fg-4)', fontSize: 11, fontStyle: 'italic' }}>Unassigned</span>}</td>
              </tr>
            ))}</tbody>
          </table>
          {items.length > MAX_VISIBLE && !showAll && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--cp-bd-zone)', textAlign: 'center' }}>
              <button onClick={() => setShowAll(true)} className="ph-focus-ring" style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Show all {items.length} →
              </button>
            </div>
          )}
        </>
      )}
    </WidgetCard>
  );
}
