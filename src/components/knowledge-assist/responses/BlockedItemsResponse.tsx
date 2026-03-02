import React from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, ScopeBar, ExtendLink } from './KAResponseShared';
import { useBlockedItems, formatTimeAgo } from './useKAData';

export function BlockedItemsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useBlockedItems();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#DC2626" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No blocked items found.</div>;

  return (
    <div>
      <CardHeader icon={ShieldAlert} iconColor="#DC2626" title="Blocked Items" titleColor="#DC2626" subtitle={`${total} total`} />
      <V12Table
        headers={['KEY', 'TITLE', 'ASSIGNEE', 'PROJECT', 'TYPE', 'BLOCKED SINCE']}
        widths={['90px', 'auto', '120px', '100px', '80px', '90px']}
      >
        {data.map(item => (
          <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
            <KeyCell value={item.issue_key} />
            <Cell>{item.summary}</Cell>
            <Cell>{item.assignee_display_name || '—'}</Cell>
            <Cell bold>{item.project_name || item.project_key}</Cell>
            <Cell muted>{item.issue_type}</Cell>
            <Cell mono muted>{formatTimeAgo(item.jira_updated_at)}</Cell>
          </Row>
        ))}
      </V12Table>
      <ScopeBar showing={data.length} total={total} label="Currently blocked" />
      <ExtendLink main="Show all blocked items" hint={`${total} items total`} />
    </div>
  );
}
