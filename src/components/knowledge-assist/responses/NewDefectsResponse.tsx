import React from 'react';
import { Bug, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink } from './KAResponseShared';
import { useNewDefects, formatTimeAgo } from './useKAData';

export function NewDefectsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useNewDefects();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#DC2626" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No new defects logged in the last 2 weeks.</div>;

  return (
    <div>
      <CardHeader icon={Bug} iconColor="#DC2626" title="New Defects" titleColor="#DC2626" subtitle={`${total} logged recently`} />
      <V12Table
        headers={['KEY', 'TITLE', 'PRIORITY', 'PROJECT', 'REPORTED BY', 'ASSIGNEE', 'LOGGED']}
        widths={['90px', 'auto', '70px', '90px', '110px', '110px', '70px']}
      >
        {data.map(item => (
          <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
            <KeyCell value={item.issue_key} />
            <Cell>{item.summary}</Cell>
            <Cell><Loz status={item.priority || 'Medium'} /></Cell>
            <Cell bold>{item.project_name || item.project_key}</Cell>
            <Cell>{item.reporter_display_name || '—'}</Cell>
            <Cell>{item.assignee_display_name || '—'}</Cell>
            <Cell mono muted>{formatTimeAgo(item.jira_created_at)}</Cell>
          </Row>
        ))}
      </V12Table>
      <ScopeBar showing={data.length} total={total} label="Logged in last 2 weeks" />
      <ExtendLink main="Load older defects" hint="items beyond 2 weeks" />
    </div>
  );
}
