import React from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink } from './KAResponseShared';
import { useChangedYesterday, formatTimeAgo } from './useKAData';

export function ChangedYesterdayResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useChangedYesterday();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#2563EB" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No changes found in the last 24 hours.</div>;

  return (
    <div>
      <CardHeader icon={CalendarDays} iconColor="#2563EB" title="Changes Since Yesterday" subtitle={`${total} items updated`} />
      <V12Table
        headers={['KEY', 'TITLE', 'STATUS', 'ASSIGNEE', 'PROJECT', 'WHEN']}
        widths={['100px', 'auto', '120px', '120px', '100px', '80px']}
      >
        {data.map(item => (
          <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
            <KeyCell value={item.issue_key} />
            <Cell>{item.summary}</Cell>
            <Cell><Loz status={item.status} /></Cell>
            <Cell>{item.assignee_display_name || '—'}</Cell>
            <Cell bold>{item.project_name || item.project_key}</Cell>
            <Cell mono muted>{formatTimeAgo(item.jira_updated_at)}</Cell>
          </Row>
        ))}
      </V12Table>
      <ScopeBar showing={data.length} total={total} label="Since yesterday" />
      <ExtendLink main="Show full activity log" hint={`${total} items in last 24 hours`} />
    </div>
  );
}
