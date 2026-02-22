/**
 * KeyMilestones — Configurable status gates widget, high contrast
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

function getDaysColor(days: number): string {
  if (days <= 1) return '#15803D';
  if (days <= 4) return '#B45309';
  return '#DC2626';
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
          <Settings size={14} color="#64748B" />
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
            <tr style={{ borderBottom: '2px solid #CBD5E1' }}>
              {['Release', 'Key', 'Type', 'Title', 'Status', 'Date', 'Days'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Inter', sans-serif" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => (
              <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F1F5F9', background: idx % 2 === 1 ? '#FAFBFC' : undefined }} className="ph-table-row">
                <td style={{ padding: '0 8px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, color: '#0F766E', background: '#F0FDFA', padding: '2px 7px', borderRadius: 4, border: '1px solid #99F6E4' }}>
                    {releaseMap[item.release_id] || '—'}
                  </span>
                </td>
                <td style={{ padding: '0 8px' }}>
                  <button onClick={() => openLifecycle(item.id)} className="ph-focus-ring" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#1D4ED8', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {item.item_key}
                  </button>
                </td>
                <td style={{ padding: '0 8px' }}>
                  <TypeBadge type={item.item_type} />
                </td>
                <td style={{ padding: '0 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1E293B', fontWeight: 500, fontFamily: "'Inter', sans-serif" }} title={item.displayTitle}>
                  {item.displayTitle}
                </td>
                <td style={{ padding: '0 8px' }}><StatusBadge status={item.status} /></td>
                <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: '#475569', fontWeight: 500 }}>
                  {item.status_date ? format(new Date(item.status_date), 'MMM d') : <span style={{ color: '#94A3B8' }}>N/A</span>}
                </td>
                <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: getDaysColor(item.days_in_status) }}>
                  {item.days_in_status}d
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WidgetCard>
  );
}
