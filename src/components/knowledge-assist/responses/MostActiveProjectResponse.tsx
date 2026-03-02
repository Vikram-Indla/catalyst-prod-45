import React from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink, F } from './KAResponseShared';
import { useMostActiveProject, formatTimeAgo } from './useKAData';

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{
      flex: 1, padding: '12px 14px',
      border: '1.5px solid rgba(15,23,42,0.08)', borderRadius: 8,
      background: '#FFFFFF',
    }}>
      <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginTop: 2, fontFamily: F.inter }}>{label}</div>
    </div>
  );
}

export function MostActiveProjectResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, stats, loading } = useMostActiveProject();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#2563EB" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No project activity found this week.</div>;

  return (
    <div>
      <CardHeader icon={FolderOpen} iconColor="#2563EB" title={`Most Active: ${stats.projectName}`} subtitle={`${stats.totalUpdated} updates this week`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <MiniStat value={`+${stats.newItems}`} label="New items" color="#1D4ED8" />
        <MiniStat value={String(stats.closed)} label="Closed" color="#16A34A" />
        <MiniStat value={String(stats.blocked)} label="Blocked" color="#DC2626" />
        <MiniStat value={String(stats.totalUpdated)} label="Updates" color="#64748B" />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, fontFamily: F.inter, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Latest Activity
      </div>
      <V12Table
        headers={['KEY', 'TITLE', 'STATUS', 'ASSIGNEE', 'WHEN']}
        widths={['90px', 'auto', '120px', '120px', '80px']}
      >
        {data.map(item => (
          <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
            <KeyCell value={item.issue_key} />
            <Cell>{item.summary}</Cell>
            <Cell><Loz status={item.status} /></Cell>
            <Cell>{item.assignee_display_name || '—'}</Cell>
            <Cell mono muted>{formatTimeAgo(item.jira_updated_at)}</Cell>
          </Row>
        ))}
      </V12Table>
      <ScopeBar showing={data.length} total={stats.totalUpdated} label="Activity this week" />
      <ExtendLink main={`Show all ${stats.totalUpdated} updates this week`} hint="" />
    </div>
  );
}
