/**
 * ItemsByStatus — Horizontal bar chart with 3-color system, high contrast
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
const STATUS_BAR_LABELS: Record<string, string> = {
  'start': 'Start',
  'in_requirements': 'Requirements',
  'in_design': 'Design',
  'ready_for_development': 'Ready for Dev',
  'in_development': 'Development',
  'on_hold': 'On Hold',
  'in_qa': 'QA',
  'in_uat': 'UAT',
  'in_entity_integration': 'Entity Integ.',
  'technical_validation': 'Tech Valid.',
  'in_beta': 'Beta',
  'end_to_end_testing': 'E2E Testing',
  'production_ready': 'Prod Ready',
  'beta_ready': 'Beta Ready',
  'in_production': 'Production',
};
function formatLabel(s: string) { return STATUS_BAR_LABELS[s] || s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

interface Props { projectId?: string | null; }

export default function ItemsByStatus({ projectId }: Props = {}) {
  const { selectedReleaseIds } = useDashboardStore();
  const { data, isLoading, error, refetch } = useItemsByStatus(projectId, selectedReleaseIds);
  const byStatus: Record<string, number> = {};
  for (const row of data ?? []) byStatus[row.status] = (byStatus[row.status] || 0) + row.item_count;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...Object.values(byStatus));
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
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 24, marginBottom: 4 }}>
              <span style={{ width: 120, textAlign: 'right', fontSize: 11, color: 'var(--fg-2)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Inter', sans-serif" }}>{formatLabel(status)}</span>
              <div className="bg-[var(--cp-bd-zone)]" style={{ flex: 1, height: 18, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: count > 0 ? `${(count / maxCount) * 100}%` : '0%', minWidth: count > 0 ? 20 : 0, background: getStatusBarColor(status), borderRadius: 4, transition: 'width 300ms ease' }} />
              </div>
              <span style={{ width: 28, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, color: 'var(--fg-1)' }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
