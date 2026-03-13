import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardDefects } from '@/hooks/useDashboardWidgets';
import { ExternalLink } from 'lucide-react';

const sevStyle = (sev: string): { bg: string; color: string } => {
  const s = (sev || '').toLowerCase();
  if (s === 'critical' || s === 'blocker') return { bg: 'var(--cp-danger-10)', color: 'var(--cp-danger-80)' };
  if (s === 'high' || s === 'major') return { bg: 'var(--cp-warning-10)', color: 'var(--cp-warning-80)' };
  return { bg: 'var(--cp-lozenge-grey-bg)', color: 'var(--cp-lozenge-grey-text)' };
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
    height: 'var(--cp-size-table-row)', background: 'var(--cp-bg-sunken)',
    borderBottom: '0.75px solid var(--cp-border-subtle)', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '0 12px', height: 'var(--cp-size-table-row)', maxHeight: 'var(--cp-size-table-row)',
    fontSize: 12, color: 'var(--cp-text-secondary)',
    borderBottom: '0.75px solid var(--cp-border-subtle)', background: 'var(--cp-bg-page)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };

  return (
    <WidgetWrapper title="QA Defects" subtitle="Cross-hub from TestHub" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1} footer={footer} flushBody>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-20 rounded" style={{ background: 'var(--cp-bg-sunken)' }} /></div>
      ) : !defects?.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>🐛</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No defects found</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 70 }}>KEY</th>
              <th style={{ ...thStyle, width: 60 }}>SEV</th>
              <th style={thStyle}>TITLE</th>
              <th style={{ ...thStyle, width: 45 }}>OPEN</th>
            </tr>
          </thead>
          <tbody>
            {defects.slice(0, 10).map(d => {
              const sv = sevStyle(d.severity || '');
              return (
                <tr key={d.id} onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-interact-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--cp-bg-page)')}>
                  <td style={{ ...tdStyle, color: 'var(--cp-primary-60)', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{d.defect_key}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 6px', fontSize: 10, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)', background: sv.bg, color: sv.color, textTransform: 'uppercase' }}>
                      {(d.severity || 'Medium').substring(0, 4).toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 140 }}>{d.title}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{d.days_open}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </WidgetWrapper>
  );
}
