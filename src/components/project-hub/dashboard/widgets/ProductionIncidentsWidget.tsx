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
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 6px',
      fontSize: 10, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)',
      background: s.bg, color: s.color, gap: 3,
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
    <WidgetWrapper title="Production Incidents" subtitle="Cross-hub from IncidentHub" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={2} headerBadges={headerBadges} footer={footer} flushBody>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-24 rounded" style={{ background: 'var(--cp-bg-sunken)' }} /></div>
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
              <th style={{ ...thStyle, width: 60 }}>KEY</th>
              <th style={{ ...thStyle, width: 40 }}>PRI</th>
              <th style={thStyle}>TITLE</th>
              <th style={{ ...thStyle, width: 50 }}>OPEN</th>
              <th style={{ ...thStyle, width: 80 }}>REPORTED</th>
            </tr>
          </thead>
          <tbody>
            {incidents.slice(0, 10).map((inc, i) => (
              <tr key={inc.id} style={{ transition: 'background 120ms' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-interact-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--cp-bg-page)')}>
                <td style={{ ...tdStyle, color: 'var(--cp-primary-60)', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{inc.incident_key}</td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 6px',
                    fontSize: 10, fontWeight: 700, borderRadius: 'var(--cp-radius-sm)',
                    background: (inc.priority || '').includes('1') ? 'var(--cp-danger-10)' : (inc.priority || '').includes('2') ? 'var(--cp-warning-10)' : 'var(--cp-lozenge-grey-bg)',
                    color: (inc.priority || '').includes('1') ? 'var(--cp-danger-80)' : (inc.priority || '').includes('2') ? 'var(--cp-warning-80)' : 'var(--cp-lozenge-grey-text)',
                  }}>{(inc.priority || 'P3').substring(0, 2).toUpperCase()}</span>
                </td>
                <td style={{ ...tdStyle, maxWidth: 200 }}>{inc.title}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{inc.days_open}d</td>
                <td style={{ ...tdStyle, fontSize: 11 }}>{inc.reporter_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WidgetWrapper>
  );
}
