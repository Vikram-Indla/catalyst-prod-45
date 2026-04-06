import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardTeamWorkload } from '@/hooks/useDashboardWidgets';

export default function TeamWorkloadWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: workload, isLoading } = useDashboardTeamWorkload(projectId);
  const maxCount = Math.max(1, ...(workload ?? []).map(w => w.total));

  return (
    <WidgetWrapper title="Team Workload" subtitle="Open items in active releases" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={2}>
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-5 rounded bg-[#F1F5F9] dark:bg-[#1A1A1A]" style={{ width: `${80 - i * 15}%` }} />)}
        </div>
      ) : !workload?.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No open items</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>No assignees with open work items in active releases.</div>
        </div>
      ) : (
        <div className="space-y-0">
          {workload.map(w => (
            <div key={w.assignee} className="flex items-center gap-3" style={{ height: 'var(--cp-size-table-row)' }}>
              {/* Avatar + Name */}
              <div className="flex items-center gap-2" style={{ minWidth: 140, maxWidth: 140 }}>
                <div className="flex items-center justify-center shrink-0 bg-[#EFF6FF] dark:bg-[#1a2744] text-[#2563EB]" style={{
                  width: 24, height: 24, borderRadius: '50%',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {w.assignee.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <span className="truncate" style={{ fontSize: 13, color: 'var(--cp-text-primary)' }}>{w.assignee}</span>
              </div>

              {/* Bar track */}
              <div className="flex-1 bg-[#F1F5F9] dark:bg-[#1A1A1A]" style={{ height: 18, borderRadius: 'var(--cp-radius-sm)', overflow: 'hidden' }}>
                <div className="bg-[#2563EB]/20 dark:bg-[#2563EB]/20" style={{
                  height: '100%', width: `${Math.max(4, (w.total / maxCount) * 100)}%`,
                  borderLeft: '3px solid var(--cp-primary-60)',
                  transition: 'width 300ms ease',
                }} />
              </div>

              {/* Count */}
              <span style={{
                minWidth: 32, textAlign: 'right',
                fontSize: 13, fontWeight: 650, color: 'var(--cp-primary-60)',
              }}>{w.total}</span>

              {/* Meta */}
              <span style={{ fontSize: 11, color: 'var(--cp-text-tertiary)', minWidth: 80 }}>
                {w.stories} stories · {w.bugs} bugs
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
