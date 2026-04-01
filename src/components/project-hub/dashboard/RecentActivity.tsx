/**
 * RecentActivity widget — JetBrains Mono timestamps, high contrast
 */
import { WidgetCard } from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useActivity } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

interface Props { projectId: string | null; }

function properCase(name: string): string {
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

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
          {items.map((item: any, i: number) => {
            const name = properCase(item.user_name || 'System');
            return (
              <div key={item.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--cp-bd-zone)' : undefined }} className="ph-table-row">
                <PersonAvatar name={name} size={20} />
                <div style={{ flex: 1, fontSize: 12, color: 'var(--fg-1)', minWidth: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.5, fontWeight: 500 }}>
                  <span style={{ fontWeight: 700 }}>{name.split(' ')[0]}</span>{' '}{item.action}
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--fg-2)', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 500 }}>
                  {item.created_at ? format(new Date(item.created_at), 'MMM d · h:mm a') : ''}
                </span>
              </div>
            );
          })}
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--cp-bd-zone)' }}>
            <button className="ph-focus-ring" style={{ fontSize: 11, fontWeight: 700, color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>View all activity →</button>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
