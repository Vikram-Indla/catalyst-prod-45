/**
 * RecentActivity widget (real data)
 */
import { WidgetCard } from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { useActivity } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

interface Props { projectId: string | null; }

export default function RecentActivity({ projectId }: Props) {
  const { selectedReleaseIds } = useDashboardStore();
  const { data, isLoading } = useActivity(projectId, selectedReleaseIds);
  const items = data ?? [];

  return (
    <WidgetCard title="Recent Activity" subtitle="Active releases only" maxHeight={320}>
      {isLoading ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Loading...</div> : items.length === 0 ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No recent activity</div> : (
        <div>
          {items.map((item: any, i: number) => (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderBottom: i < items.length - 1 ? '1px solid #F8FAFC' : undefined }}>
              <PersonAvatar name={item.user_name || 'System'} size={20} />
              <div style={{ flex: 1, fontSize: 12, color: '#334155', minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{item.user_name?.split(' ')[0] || 'System'}</span>{' '}{item.action}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#CBD5E1', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {item.created_at ? format(new Date(item.created_at), 'MMM d · h:mm a') : ''}
              </span>
            </div>
          ))}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #F1F5F9' }}>
            <button style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>View all activity →</button>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
