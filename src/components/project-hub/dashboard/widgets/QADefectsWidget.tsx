import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardDefects } from '@/hooks/useDashboardWidgets';
import { ExternalLink } from 'lucide-react';

const sevClassName = (sev: string): string => {
  const s = (sev || '').toLowerCase();
  if (s === 'critical' || s === 'blocker') return 'bg-[#FFEBE6] dark:bg-[#3a1a1a] text-[#BF2600] dark:text-[#ff8f73]';
  if (s === 'high' || s === 'major') return 'bg-[#FFF7E6] dark:bg-[#3a2e1a] text-[#A36200] dark:text-[#ffc44d]';
  return 'bg-[#DFE1E6] dark:bg-[#3A3530] text-[#253858] dark:text-[#A09890]';
};

export default function QADefectsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: defects, isLoading } = useDashboardDefects(projectId);

  const footer = (
    <a href="/test-hub" style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-primary-60)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
      View All in TestHub <ExternalLink size={11} />
    </a>
  );

  const thStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em',
    color: 'var(--cp-text-tertiary)', padding: '0 12px',
    height: 'var(--cp-size-table-row)',
    borderBottom: '0.75px solid var(--cp-border-subtle)', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const thClassName = 'bg-[#F1F5F9] dark:bg-[#2C2823]';
  const tdStyle: React.CSSProperties = {
    padding: '0 12px', height: 'var(--cp-size-table-row)', maxHeight: 'var(--cp-size-table-row)',
    fontSize: 12, color: 'var(--cp-text-secondary)',
    borderBottom: '0.75px solid var(--cp-border-subtle)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const tdClassName = 'bg-white dark:bg-[#1A1714]';

  return (
    <WidgetWrapper title="QA Defects" subtitle="Cross-hub from TestHub" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1} footer={footer} flushBody>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-20 rounded bg-[#F1F5F9] dark:bg-[#2C2823]" /></div>
      ) : !defects?.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>🐛</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No defects found</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className={thClassName} style={{ ...thStyle, width: 70 }}>KEY</th>
              <th className={thClassName} style={{ ...thStyle, width: 60 }}>SEV</th>
              <th className={thClassName} style={thStyle}>TITLE</th>
              <th className={thClassName} style={{ ...thStyle, width: 45 }}>OPEN</th>
            </tr>
          </thead>
          <tbody>
            {defects.slice(0, 10).map(d => {
              const svCls = sevClassName(d.severity || '');
              return (
                <tr key={d.id} className="transition-colors duration-[120ms] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] bg-white dark:bg-[#1A1714]">
                  <td className={tdClassName} style={{ ...tdStyle, color: 'var(--cp-primary-60)', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{d.defect_key}</td>
                  <td className={tdClassName} style={tdStyle}>
                    <span className={`inline-flex items-center ${svCls}`} style={{ height: 18, padding: '0 6px', fontSize: 10, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)', textTransform: 'uppercase' }}>
                      {(d.severity || 'Medium').substring(0, 4).toUpperCase()}
                    </span>
                  </td>
                  <td className={tdClassName} style={{ ...tdStyle, maxWidth: 140 }}>{d.title}</td>
                  <td className={tdClassName} style={{ ...tdStyle, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{d.days_open}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </WidgetWrapper>
  );
}
