/**
 * OnHoldItems widget — high contrast text
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
    <WidgetCard title="On Hold" count={items.length} countColor="var(--sem-danger)" maxHeight={280} error={error ? error.message : null} onRetry={() => refetch()}>
      {isLoading ? (
        <WidgetSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState message="No items on hold" icon="info" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--divider)' }}>
              {['Release', 'Key', 'Title', 'Days', 'Reason'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Inter', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => (
              <tr key={item.id} className={`ph-table-row ${idx % 2 === 1 ? 'bg-[var(--bg-1)]' : ''}`} style={{ height: 44, borderBottom: '1px solid var(--cp-bd-zone)' }}>
                <td style={{ padding: '0 8px' }}>
                  <span className="bg-[var(--sem-success-bg)]" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, color: 'var(--sem-success-fg)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--sem-success-accent)' }}>
                    {releaseMap[item.release_id] || '—'}
                  </span>
                </td>
                <td style={{ padding: '0 8px' }}>
                  <button onClick={() => openLifecycle(item.id)} className="ph-focus-ring" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--cp-primary-70)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {item.item_key}
                  </button>
                </td>
                <td style={{ padding: '0 8px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-1)', fontWeight: 500, fontFamily: "'Inter', sans-serif" }} title={item.displayTitle}>
                  {item.displayTitle}
                </td>
                <td style={{ padding: '0 8px' }}>
                  <span className={item.days_on_hold > 3 ? 'bg-[var(--sem-danger)]' : 'bg-[var(--sem-warning)]'} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: '#FFFFFF', padding: '2px 7px', borderRadius: 9999 }}>
                    {item.days_on_hold > 0 ? `${item.days_on_hold}d` : 'N/A'}
                  </span>
                </td>
                <td style={{ padding: '0 8px', fontSize: 11, color: item.on_hold_reason ? 'var(--fg-2)' : 'var(--fg-4)', fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }} title={item.on_hold_reason || undefined}>
                  {item.on_hold_reason || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WidgetCard>
  );
}
