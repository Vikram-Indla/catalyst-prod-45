import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, ScopeBar, ExtendLink } from './KAResponseShared';
import { useClosedItems, formatTimeAgo } from './useKAData';

export function ClosedThisWeekResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useClosedItems();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#16A34A" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No items closed recently.</div>;

  return (
    <div>
      <CardHeader icon={CheckCircle} iconColor="#16A34A" title="Closed Recently" titleColor="#16A34A" subtitle={`${total} resolved`} />
      <V12Table
        headers={['KEY', 'TITLE', 'TYPE', 'PROJECT', 'ASSIGNEE', 'CLOSED']}
        widths={['90px', 'auto', '80px', '100px', '120px', '80px']}
      >
        {data.map(item => (
          <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
            <KeyCell value={item.issue_key} />
            <Cell>{item.summary}</Cell>
            <Cell muted>{item.issue_type}</Cell>
            <Cell bold>{item.project_name || item.project_key}</Cell>
            <Cell>{item.assignee_display_name || '—'}</Cell>
            <Cell mono muted>{formatTimeAgo(item.jira_updated_at)}</Cell>
          </Row>
        ))}
      </V12Table>
      <ScopeBar showing={data.length} total={total} label="Closed in last 2 weeks" />
      <ExtendLink main="Load earlier closures" hint="items beyond 2 weeks" />
    </div>
  );
}
