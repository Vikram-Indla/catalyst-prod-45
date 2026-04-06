import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOverdueItems } from '@/hooks/useDashboardWidgets';

export default function OverdueWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: items, isLoading } = useDashboardOverdueItems(projectId);
  const count = items?.length ?? 0;

  const badge = (
    <span className={count === 0 ? 'bg-[var(--status-ok-bg, #E3FCEF)] dark:bg-[#1a3a2a] text-[#006644] dark:text-[#57d9a3]' : 'bg-[#FFEBE6] dark:bg-[#3a1a1a] text-[#BF2600] dark:text-[#ff8f73]'} style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
      fontSize: 11, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)',
    }}>{count}</span>
  );

  return (
    <WidgetWrapper title="Overdue" subtitle="Past due date" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1} headerBadges={badge}>
      {isLoading ? (
        <div className="animate-pulse"><div className="h-12 rounded bg-[#F1F5F9] dark:bg-[#1A1A1A]" /></div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>All items on track</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>No overdue items across active releases</div>
        </div>
      ) : (
        <div className="space-y-0">
          {items!.slice(0, 8).map(item => (
            <div key={item.id} className="flex items-center gap-2" style={{
              height: 'var(--cp-size-table-row)', padding: '0 4px',
              borderBottom: '0.75px solid var(--cp-border-subtle)',
              fontSize: 12,
            }}>
              <span style={{ color: 'var(--cp-primary-60)', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', fontSize: 11, flexShrink: 0 }}>{item.issue_key}</span>
              <span className="truncate flex-1" style={{ color: 'var(--cp-text-secondary)' }}>{item.summary}</span>
              <span style={{ color: 'var(--cp-danger-60)', fontFamily: 'var(--cp-font-mono)', fontSize: 11, flexShrink: 0 }}>
                {Math.ceil((Date.now() - new Date(item.due_date!).getTime()) / 86400000)}d
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
