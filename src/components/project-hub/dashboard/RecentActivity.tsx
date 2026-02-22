/**
 * RecentActivity widget (real data)
 */
import { WidgetCard } from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useActivity } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

interface Props { projectId: string | null; }

export default function RecentActivity({ projectId }: Props) {
  const { selectedReleaseIds } = useDashboardStore();
  const { data, isLoading, error, refetch } = useActivity(projectId, selectedReleaseIds);
  const items = data ?? [];

  return (
    <WidgetCard title="Recent Activity" subtitle="Active releases only" maxHeight={320} error={error ? error.message : null} onRetry={() => refetch()}>
      {isLoading ? (
        <WidgetSkeleton rows={5} type="list" />
      ) : items.length === 0 ? (
        <EmptyState message="No recent activity in active releases" icon="info" />
      ) : (
        <div>
          {items.map((item: any, i: number) => (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 16px', borderBottom: i < items.length - 1 ? '1px solid #F8FAFC' : undefined, transition: 'background 120ms ease' }} className="ph-table-row">
              <PersonAvatar name={item.user_name || 'System'} size={20} />
              <div style={{ flex: 1, fontSize: 12, color: '#334155', minWidth: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600 }}>{(item.user_name || 'System').split(' ')[0]}</span>{' '}{item.action}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {item.created_at ? format(new Date(item.created_at), 'MMM d · h:mm a') : ''}
              </span>
            </div>
          ))}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #F1F5F9' }}>
            <button className="ph-focus-ring" style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>View all activity →</button>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
