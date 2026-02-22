/**
 * KeyMilestones — Configurable status gates widget
 */
import { Settings } from 'lucide-react';
import WidgetCard from './WidgetCard';
import StatusBadge from './StatusBadge';
import { TypeBadge } from './TypeBadge';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useKeyMilestones } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

interface Props {
  projectId: string | null;
  onConfigOpen: () => void;
  releaseMap: Record<string, string>;
}

export default function KeyMilestones({ projectId, onConfigOpen, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading, error, refetch } = useKeyMilestones(projectId, selectedReleaseIds);

  const items = data ?? [];

  return (
    <WidgetCard
      title="Key Milestones"
      subtitle="Configurable status gates"
      count={items.length}
      countColor="#2563EB"
      maxHeight={320}
      error={error ? error.message : null}
      onRetry={() => refetch()}
      headerRight={
        <button onClick={onConfigOpen} aria-label="Configure milestones" className="ph-focus-ring" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Settings size={14} color="#94A3B8" />
        </button>
      }
    >
      {isLoading ? (
        <WidgetSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState message="No items at milestone statuses" icon="check" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Release', 'Key', 'Type', 'Title', 'Status', 'Date', 'Days'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: "'Inter', sans-serif" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              return (
                <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC', background: idx % 2 === 1 ? '#FAFBFC' : undefined, transition: 'background 120ms ease' }} className="ph-table-row">
                  <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0D9488', fontWeight: 600 }}>
                    {releaseMap[item.release_id] || '—'}
                  </td>
                  <td style={{ padding: '0 8px' }}>
                    <button
                      onClick={() => openLifecycle(item.id)}
                      className="ph-focus-ring"
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {item.item_key}
                    </button>
                  </td>
                  <td style={{ padding: '0 8px' }}>
                    <TypeBadge type={item.item_type} />
                  </td>
                  <td style={{ padding: '0 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155', fontFamily: "'Inter', sans-serif" }} title={item.displayTitle}>
                    {item.displayTitle}
                  </td>
                  <td style={{ padding: '0 8px' }}><StatusBadge status={item.status} /></td>
                  <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: '#64748B' }}>
                    {item.status_date ? format(new Date(item.status_date), 'MMM d') : <span style={{ color: '#94A3B8' }}>N/A</span>}
                  </td>
                  <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: item.days_in_status === 0 ? '#16A34A' : item.days_in_status > 5 ? '#EF4444' : item.days_in_status > 2 ? '#D97706' : '#16A34A' }}>
                    {item.days_in_status}d
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </WidgetCard>
  );
}
