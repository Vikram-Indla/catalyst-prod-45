import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardIncidents } from '@/hooks/useDashboardWidgets';
import { ExternalLink } from 'lucide-react';

const getAvatarColor = (initials: string): string => {
  if (!initials) return 'rgba(237,237,237,0.40)';
  const colors = ['#2563EB', '#0D9488', '#D97706', '#DC2626', '#059669', '#6366F1'];
  return colors[initials.charCodeAt(0) % colors.length];
};

const priClassName = (pri: string): string => {
  const p = (pri || '').toLowerCase();
  if (p === 'highest' || p === 'p1') return 'bg-[#FFEBE6] dark:bg-[#3a1a1a] text-[#BF2600] dark:text-[#ff8f73]';
  if (p === 'high' || p === 'p2') return 'bg-[#FFF7E6] dark:bg-[#3a2e1a] text-[#A36200] dark:text-[#ffc44d]';
  return 'bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]';
};

const priLabel = (pri: string): string => {
  const p = (pri || '').toLowerCase();
  if (p === 'highest') return 'P1';
  if (p === 'high') return 'P2';
  if (p === 'medium') return 'P3';
  if (p === 'low' || p === 'lowest') return 'P4';
  return pri?.substring(0, 2).toUpperCase() || 'P3';
};

export default function ProductionIncidentsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: incidents, isLoading } = useDashboardIncidents(projectId, projectKey);

  const footer = (
    <a href="/incident-hub" style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-primary-60)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
      View All in IncidentHub <ExternalLink size={11} />
    </a>
  );

  const thStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em',
    color: 'var(--cp-text-tertiary)', padding: '8px 12px',
    height: 'var(--cp-size-table-row)',
    borderBottom: '0.75px solid var(--cp-border-subtle)', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const thClassName = 'bg-[#1A1A1A] dark:bg-[#1A1A1A]';
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', height: 'var(--cp-size-table-row)', maxHeight: 'var(--cp-size-table-row)',
    fontSize: 12, color: 'var(--cp-text-secondary)',
    borderBottom: '0.75px solid var(--cp-border-subtle)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const tdClassName = 'bg-white dark:bg-[#1A1A1A]';

  return (
    <WidgetWrapper title="Production Incidents" subtitle="Cross-hub from IncidentHub" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={2} footer={footer} flushBody>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-24 rounded bg-[#1A1A1A] dark:bg-[#1A1A1A]" /></div>
      ) : !incidents?.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>🛡</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No production incidents</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>No open incidents for this project.</div>
        </div>
      ) : (
        <>
          {/* Status summary bar */}
          <div style={{ padding: '8px 12px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '0.75px solid var(--cp-border-subtle)' }}>
            <span style={{ fontSize: 11, fontWeight: 650, color: 'var(--cp-text-primary)' }}>{incidents.length} incidents</span>
            {(() => {
              const open = incidents.filter((d: any) => d.status_category !== 'Done').length;
              const resolved = incidents.filter((d: any) => d.status_category === 'Done' && d.resolution).length;
              const closed = incidents.filter((d: any) => d.status_category === 'Done' && !d.resolution).length;
              return (
                <>
                  {open > 0 && <span className="bg-[rgba(59,130,246,0.10)] dark:bg-[#1a2a3a] text-[#0747A6] dark:text-[#79b8ff]" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{open} OPEN</span>}
                  {resolved > 0 && <span className="bg-[rgba(74,222,128,0.10)] dark:bg-[#1a3a2a] text-[#006644] dark:text-[#85e89d]" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{resolved} RESOLVED</span>}
                  {closed > 0 && <span className="bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{closed} CLOSED</span>}
                </>
              );
            })()}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className={thClassName} style={{ ...thStyle, width: 80 }}>KEY</th>
                <th className={thClassName} style={{ ...thStyle, width: 40 }}>PRI</th>
                <th className={thClassName} style={thStyle}>TITLE</th>
                <th className={thClassName} style={{ ...thStyle, width: 72 }}>STATUS</th>
                <th className={thClassName} style={{ ...thStyle, width: 90 }}>ASSIGNEE</th>
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 10).map((inc: any) => {
                const pCls = priClassName(inc.priority);
                const isDone = inc.status_category === 'Done';
                const statusLabel = (inc.status || 'open').replace(/_/g, ' ');
                const statusCls = isDone
                  ? inc.resolution
                    ? 'bg-[rgba(74,222,128,0.10)] dark:bg-[#1a3a2a] text-[#006644] dark:text-[#85e89d]'
                    : 'bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]'
                  : 'bg-[rgba(59,130,246,0.10)] dark:bg-[#1a2a3a] text-[#0747A6] dark:text-[#79b8ff]';
                const assigneeName = inc.assignee || '';
                const assigneeFirst = assigneeName ? assigneeName.split(' ')[0] : '—';
                const assigneeInitials = assigneeName ? assigneeName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '';
                const avatarColor = getAvatarColor(assigneeInitials);
                const avatarUrl = inc.assignee_avatar_url;
                return (
                  <tr key={inc.id} className="transition-colors duration-[120ms] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] bg-white dark:bg-[#1A1A1A]">
                    <td className={tdClassName} style={{ ...tdStyle, color: 'var(--cp-primary-60)', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{inc.issue_key}</td>
                    <td className={tdClassName} style={tdStyle}>
                      <span className={`inline-flex items-center ${pCls}`} style={{ height: 18, padding: '0 6px', fontSize: 10, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)', textTransform: 'uppercase' }}>
                        {priLabel(inc.priority)}
                      </span>
                    </td>
                    <td className={tdClassName} style={{ ...tdStyle, maxWidth: 200 }}>{inc.title}</td>
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
