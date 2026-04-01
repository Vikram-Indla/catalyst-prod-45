/**
 * LatestInProduction — Recently deployed items, high contrast
 */
import WidgetCard from './WidgetCard';
import { TypeBadge } from './TypeBadge';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useInProduction } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

export default function LatestInProduction({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading, error, refetch } = useInProduction(projectId, selectedReleaseIds);
  const items = data ?? [];

  return (
    <WidgetCard
      title="Latest in Production"
      count={items.length}
      countColor="var(--sem-success)"
      leftBorder="#16A34A"
      maxHeight={320}
      error={error ? error.message : null}
      onRetry={() => refetch()}
    >
      {isLoading ? (
        <WidgetSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState message="No items deployed yet in active releases" icon="info" />
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--divider)' }}>
                {['Release', 'Key', 'Type', 'Title', 'Deployed', 'Since'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Inter', sans-serif" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const deployDate = item.deploy_date || item.updated_at;
                const daysSince = deployDate
                  ? Math.ceil((Date.now() - new Date(deployDate).getTime()) / 86400000)
                  : 0;
                return (
                  <tr key={item.id} style={{ height: 44, borderBottom: '1px solid var(--cp-bd-zone)', background: idx % 2 === 1 ? 'var(--bg-1)' : undefined }} className="ph-table-row">
                    <td style={{ padding: '0 8px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, color: 'var(--sem-success-fg)', background: 'var(--sem-success-bg)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--sem-success-accent)' }}>
                        {releaseMap[item.release_id] || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0 8px' }}>
                      <button onClick={() => openLifecycle(item.id)} className="ph-focus-ring" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--cp-primary-70)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                        {item.item_key}
                      </button>
                    </td>
                    <td style={{ padding: '0 8px' }}>
                      <TypeBadge type={item.item_type} />
                    </td>
                    <td style={{ padding: '0 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-1)', fontWeight: 500, fontFamily: "'Inter', sans-serif" }} title={item.displayTitle}>
                      {item.displayTitle}
                    </td>
                    <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--fg-2)', fontWeight: 500 }}>
                      {deployDate ? format(new Date(deployDate), 'MMM d') : '—'}
                    </td>
                    <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--sem-success-fg)' }}>
                      {daysSince}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--sem-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid var(--cp-bd-zone)' }}>
            <CheckCircle size={12} /> All deployments stable
          </div>
        </>
      )}
    </WidgetCard>
  );
}
