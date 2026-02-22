/**
 * OnHoldItems widget (real data)
 */
import WidgetCard from './WidgetCard';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useOnHold } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

export default function OnHoldItems({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading, error, refetch } = useOnHold(projectId, selectedReleaseIds);
  const items = data ?? [];

  return (
    <WidgetCard title="On Hold" count={items.length} countColor="#EF4444" maxHeight={280} error={error ? error.message : null} onRetry={() => refetch()}>
      {isLoading ? (
        <WidgetSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState message="No items on hold" icon="info" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Release', 'Key', 'Title', 'Days', 'Reason'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: "'Inter', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => (
              <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC', background: idx % 2 === 1 ? '#FAFBFC' : undefined, transition: 'background 120ms ease' }} className="ph-table-row">
                <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0D9488', fontWeight: 600 }}>
                  {releaseMap[item.release_id] || '—'}
                </td>
                <td style={{ padding: '0 8px' }}>
                  <button onClick={() => openLifecycle(item.id)} className="ph-focus-ring" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {item.item_key}
                  </button>
                </td>
                <td style={{ padding: '0 8px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155', fontFamily: "'Inter', sans-serif" }} title={item.displayTitle}>
                  {item.displayTitle}
                </td>
                <td style={{ padding: '0 8px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '2px 6px', borderRadius: 4 }}>
                    {item.days_on_hold > 0 ? `${item.days_on_hold}d` : '0d'}
                  </span>
                </td>
                <td style={{ padding: '0 8px', fontSize: 10, color: '#94A3B8', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }} title={item.on_hold_reason || undefined}>
                  {item.on_hold_reason || 'No reason specified'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WidgetCard>
  );
}
