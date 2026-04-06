import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardRecentActivity } from '@/hooks/useDashboardWidgets';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RecentActivityWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: items, isLoading } = useDashboardRecentActivity(projectId);

  return (
    <WidgetWrapper title="Recent Activity" subtitle="Latest changes" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1}>
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-4 rounded bg-[#F1F5F9] dark:bg-[#1A1A1A]" style={{ width: `${90 - i * 10}%` }} />)}
        </div>
      ) : !items?.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No recent activity</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>Activity appears when items are created, updated, or transitioned</div>
        </div>
      ) : (
        <div className="space-y-0">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-2 py-2" style={{
              borderBottom: '0.75px solid var(--cp-border-subtle)',
            }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--cp-primary-60)', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{item.issue_key}</span>
                  <span className={`inline-flex items-center ${item.status_category === 'Done' ? 'bg-[#E3FCEF] dark:bg-[#1a3a2a] text-[#006644] dark:text-[#57d9a3]' : item.status_category === 'In Progress' ? 'bg-[#DEEBFF] dark:bg-[#1a3a5c] text-[#0747A6] dark:text-[#7bb0ff]' : 'bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]'}`} style={{
                    height: 18, padding: '0 6px',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                    borderRadius: 'var(--cp-radius-sm)',
                  }}>{(item.status || '—').toUpperCase()}</span>
                </div>
                <div className="truncate" style={{ fontSize: 12, color: 'var(--cp-text-secondary)', marginTop: 2 }}>{item.summary}</div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--cp-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {timeAgo(item.jira_updated_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
