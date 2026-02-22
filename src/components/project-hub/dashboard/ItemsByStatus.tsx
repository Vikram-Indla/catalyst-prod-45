/**
 * ItemsByStatus — Horizontal bar chart (real data)
 */
import { WidgetCard } from './WidgetCard';
import { getStatusBarColor } from './StatusBadge';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useItemsByStatus } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';

const STATUS_ORDER = [
  'start', 'in_requirements', 'in_design', 'ready_for_development',
  'in_development', 'on_hold', 'in_qa', 'in_uat', 'in_entity_integration', 'technical_validation',
  'in_beta', 'end_to_end_testing', 'production_ready', 'beta_ready', 'in_production',
];
function formatLabel(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

export default function ItemsByStatus() {
  const { selectedReleaseIds } = useDashboardStore();
  const { data, isLoading, error, refetch } = useItemsByStatus(selectedReleaseIds);
  const byStatus: Record<string, number> = {};
  for (const row of data ?? []) byStatus[row.status] = (byStatus[row.status] || 0) + row.item_count;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...Object.values(byStatus));
  // Show all statuses that exist, including zero-count ones from STATUS_ORDER if total > 0
  const sorted = STATUS_ORDER.filter(s => byStatus[s] !== undefined).map(s => ({ status: s, count: byStatus[s] ?? 0 }));

  return (
    <WidgetCard title="Items by Status" subtitle={`${total} items across active releases`} error={error ? error.message : null} onRetry={() => refetch()}>
      {isLoading ? (
        <WidgetSkeleton rows={5} type="chart" />
      ) : sorted.length === 0 ? (
        <EmptyState message="No items in active releases" icon="info" />
      ) : (
        <div style={{ padding: '8px 16px 12px' }}>
          {sorted.map(({ status, count }) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 100, textAlign: 'right', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Inter', sans-serif" }}>{formatLabel(status)}</span>
              <div style={{ flex: 1, height: 20, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: count > 0 ? `${(count / maxCount) * 100}%` : '0%', background: getStatusBarColor(status), borderRadius: 3, transition: 'width 300ms ease' }} />
              </div>
              <span style={{ width: 28, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: '#334155' }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
