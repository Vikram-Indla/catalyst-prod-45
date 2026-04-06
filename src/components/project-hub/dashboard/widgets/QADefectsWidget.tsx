import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardDefects } from '@/hooks/useDashboardWidgets';
import { ExternalLink } from 'lucide-react';

const getAvatarColor = (initials: string): string => {
  if (!initials) return 'var(--fg-3, #94A3B8)';
  const colors = ['#2563EB', '#0D9488', '#D97706', '#DC2626', '#059669', '#6366F1'];
  return colors[initials.charCodeAt(0) % colors.length];
};

const sevClassName = (sev: string): string => {
  const s = (sev || '').toLowerCase();
  if (s === 'critical' || s === 'blocker') return 'bg-[#FFEBE6] dark:bg-[#3a1a1a] text-[#BF2600] dark:text-[#ff8f73]';
  if (s === 'high' || s === 'major') return 'bg-[#FFF7E6] dark:bg-[#3a2e1a] text-[#A36200] dark:text-[#ffc44d]';
  return 'bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]';
};

export default function QADefectsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: defects, isLoading } = useDashboardDefects(projectId, projectKey);

  const footer = (
    <a href="/test-hub" style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-primary-60)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
      View All in TestHub <ExternalLink size={11} />
    </a>
  );

  const thStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em',
    color: 'var(--cp-text-tertiary)', padding: '8px 12px',
    height: 'var(--cp-size-table-row)',
    borderBottom: '0.75px solid var(--cp-border-subtle)', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const thClassName = 'bg-[#F1F5F9] dark:bg-[#1A1A1A]';
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', height: 'var(--cp-size-table-row)', maxHeight: 'var(--cp-size-table-row)',
    fontSize: 12, color: 'var(--cp-text-secondary)',
    borderBottom: '0.75px solid var(--cp-border-subtle)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const tdClassName = 'bg-white dark:bg-[#1A1A1A]';

  return (
    <WidgetWrapper title="QA Defects" subtitle="Cross-hub from TestHub" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1} footer={footer} flushBody>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-20 rounded bg-[#F1F5F9] dark:bg-[#1A1A1A]" /></div>
      ) : !defects?.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>🐛</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No defects found</div>
        </div>
      ) : (
        <>
          {/* Status summary bar */}
          <div style={{ padding: '8px 12px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '0.75px solid var(--cp-border-subtle)' }}>
            <span style={{ fontSize: 11, fontWeight: 650, color: 'var(--cp-text-primary)' }}>{defects.length} defects</span>
            {(() => {
              const open = defects.filter((d: any) => ['open', 'new', 'in_progress', 'reopened'].includes(d.status)).length;
              const resolved = defects.filter((d: any) => ['resolved', 'fixed', 'verified'].includes(d.status)).length;
              const closed = defects.filter((d: any) => d.status === 'closed').length;
              return (
                <>
                  {open > 0 && <span className="bg-[#DEEBFF] dark:bg-[#1a2a3a] text-[#0747A6] dark:text-[#79b8ff]" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{open} OPEN</span>}
                  {resolved > 0 && <span className="bg-[var(--status-ok-bg, #E3FCEF)] dark:bg-[#1a3a2a] text-[#006644] dark:text-[#85e89d]" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{resolved} RESOLVED</span>}
                  {closed > 0 && <span className="bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{closed} CLOSED</span>}
                </>
              );
            })()}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className={thClassName} style={{ ...thStyle, width: 80 }}>KEY</th>
                <th className={thClassName} style={{ ...thStyle, width: 50 }}>SEV</th>
                <th className={thClassName} style={thStyle}>TITLE</th>
                <th className={thClassName} style={{ ...thStyle, width: 72 }}>STATUS</th>
                <th className={thClassName} style={{ ...thStyle, width: 90 }}>ASSIGNEE</th>
              </tr>
            </thead>
            <tbody>
              {defects.slice(0, 10).map((d: any) => {
                const svCls = sevClassName(d.severity || '');
                const displayKey = d.jira_key || d.defect_key;
                const statusLabel = (d.status || 'open').replace(/_/g, ' ');
                const isOpen = ['open', 'new', 'in_progress', 'reopened'].includes(d.status);
                const isResolved = ['resolved', 'fixed', 'verified'].includes(d.status);
                const statusCls = isOpen
                  ? 'bg-[#DEEBFF] dark:bg-[#1a2a3a] text-[#0747A6] dark:text-[#79b8ff]'
                  : isResolved
                  ? 'bg-[var(--status-ok-bg, #E3FCEF)] dark:bg-[#1a3a2a] text-[#006644] dark:text-[#85e89d]'
                  : 'bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]';
                const assigneeName = d.jira_assignee_name || '';
                const assigneeFirst = assigneeName ? assigneeName.split(' ')[0] : '—';
                const assigneeInitials = assigneeName ? assigneeName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '';
                const avatarColor = getAvatarColor(assigneeInitials);
                const avatarUrl = d.assignee_avatar_url;
                return (
                  <tr key={d.id} className="transition-colors duration-[120ms] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] bg-white dark:bg-[#1A1A1A]">
                    <td className={tdClassName} style={{ ...tdStyle, color: 'var(--cp-primary-60)', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{displayKey}</td>
                    <td className={tdClassName} style={tdStyle}>
                      <span className={`inline-flex items-center ${svCls}`} style={{ height: 18, padding: '0 6px', fontSize: 10, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)', textTransform: 'uppercase' }}>
                        {(d.severity || 'minor').substring(0, 4).toUpperCase()}
                      </span>
                    </td>
                    <td className={tdClassName} style={{ ...tdStyle, maxWidth: 140 }}>{d.title}</td>
                    <td className={tdClassName} style={tdStyle}>
                      <span className={`inline-flex items-center ${statusCls}`} style={{ height: 18, padding: '0 6px', fontSize: 10, fontWeight: 700, borderRadius: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className={tdClassName} style={{ ...tdStyle, fontSize: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {assigneeInitials ? (
                          avatarUrl ? (
                            <img src={avatarUrl} alt={assigneeName} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: avatarColor, color: '#FFFFFF', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {assigneeInitials}
                            </div>
                          )
                        ) : null}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{assigneeFirst}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </WidgetWrapper>
  );
}
