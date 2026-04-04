import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardIncidents } from '@/hooks/useDashboardWidgets';
import { ExternalLink } from 'lucide-react';

function PriBadge({ pri, count }: { pri: string; count: number }) {
  const styles: Record<string, { bg: string; color: string }> = {
    P1: { bg: 'var(--cp-danger-10)', color: 'var(--cp-danger-80)' },
    P2: { bg: 'var(--cp-warning-10)', color: 'var(--cp-warning-80)' },
    P3: { bg: 'var(--cp-lozenge-grey-bg)', color: 'var(--cp-lozenge-grey-text)' },
  };
  const s = styles[pri] ?? styles.P3;
  return (
    <span className={`inline-flex items-center ${pri === 'P1' ? 'bg-[#FFEBE6] dark:bg-[#3a1a1a] text-[#BF2600] dark:text-[#ff8f73]' : pri === 'P2' ? 'bg-[#FFF7E6] dark:bg-[#3a2e1a] text-[#A36200] dark:text-[#ffc44d]' : 'bg-[#DFE1E6] dark:bg-[#3A3530] text-[#253858] dark:text-[#A09890]'}`} style={{
      height: 18, padding: '0 6px',
      fontSize: 10, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)',
      gap: 3,
    }}>
      {pri} <span>{count}</span>
    </span>
  );
}

export default function ProductionIncidentsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: incidents, isLoading } = useDashboardIncidents(projectId);

  // Count by priority
  const priCounts: Record<string, number> = {};
  for (const inc of incidents ?? []) {
    const p = (inc.priority || 'P3').toUpperCase();
    const key = p.startsWith('P') ? p.substring(0, 2) : 'P3';
    priCounts[key] = (priCounts[key] ?? 0) + 1;
  }

  const headerBadges = (
    <div className="flex items-center gap-1">
      {['P1', 'P2', 'P3'].map(p => priCounts[p] ? <PriBadge key={p} pri={p} count={priCounts[p]} /> : null)}
    </div>
  );

  const footer = (
    <a href="/incident-hub" style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-primary-60)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
      View All in IncidentHub <ExternalLink size={11} />
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
    <WidgetWrapper title="Production Incidents" subtitle="Cross-hub from IncidentHub" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={2} headerBadges={headerBadges} footer={footer} flushBody>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-24 rounded bg-[#F1F5F9] dark:bg-[#2C2823]" /></div>
      ) : !incidents?.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>🛡</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No production incidents</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>No open incidents for this project.</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className={thClassName} style={{ ...thStyle, width: 60 }}>KEY</th>
              <th className={thClassName} style={{ ...thStyle, width: 40 }}>PRI</th>
              <th className={thClassName} style={thStyle}>TITLE</th>
              <th className={thClassName} style={{ ...thStyle, width: 50 }}>OPEN</th>
              <th className={thClassName} style={{ ...thStyle, width: 80 }}>REPORTED</th>
            </tr>
          </thead>
          <tbody>
            {incidents.slice(0, 10).map((inc, i) => (
              <tr key={inc.id} className="transition-colors duration-[120ms] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] bg-white dark:bg-[#1A1714]">
                <td className={tdClassName} style={{ ...tdStyle, color: 'var(--cp-primary-60)', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{inc.incident_key}</td>
                <td className={tdClassName} style={tdStyle}>
                  <span className={`inline-flex items-center ${(inc.priority || '').includes('1') ? 'bg-[#FFEBE6] dark:bg-[#3a1a1a] text-[#BF2600] dark:text-[#ff8f73]' : (inc.priority || '').includes('2') ? 'bg-[#FFF7E6] dark:bg-[#3a2e1a] text-[#A36200] dark:text-[#ffc44d]' : 'bg-[#DFE1E6] dark:bg-[#3A3530] text-[#253858] dark:text-[#A09890]'}`} style={{
                    height: 18, padding: '0 6px',
                    fontSize: 10, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)',
                  }}>{(inc.priority || 'P3').substring(0, 2).toUpperCase()}</span>
                </td>
                <td className={tdClassName} style={{ ...tdStyle, maxWidth: 200 }}>{inc.title}</td>
                <td className={tdClassName} style={{ ...tdStyle, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{inc.days_open}d</td>
                <td className={tdClassName} style={{ ...tdStyle, fontSize: 11 }}>{inc.reporter_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WidgetWrapper>
  );
}
