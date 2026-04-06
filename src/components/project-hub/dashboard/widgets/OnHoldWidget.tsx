import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOnHoldItems } from '@/hooks/useDashboardWidgets';

export default function OnHoldWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: items, isLoading } = useDashboardOnHoldItems(projectId);
  const count = items?.length ?? 0;

  const badge = (
    <span className="bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]" style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
      fontSize: 11, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)',
    }}>{count}</span>
  );

  return (
    <WidgetWrapper title="On Hold" subtitle="Blocked items" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1} headerBadges={badge}>
      {isLoading ? (
        <div className="animate-pulse"><div className="h-12 rounded bg-[#1A1A1A] dark:bg-[#1A1A1A]" /></div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>◻</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No items on hold</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>No blocked or paused items</div>
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
              <span className="bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]" style={{
                display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                borderRadius: 'var(--cp-radius-sm)',
                flexShrink: 0,
              }}>ON HOLD</span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
