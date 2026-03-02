import React from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink } from './KAResponseShared';
import { useReopenedItems, formatTimeAgo } from './useKAData';

export function ReopenedItemsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useReopenedItems();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#D97706" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No re-opened items found.</div>;

  return (
    <div>
      <CardHeader icon={RotateCcw} iconColor="#D97706" title="Re-opened Items" titleColor="#D97706" subtitle={`${total} bounced back`} />
      <V12Table
        headers={['KEY', 'TITLE', 'STATUS', 'ASSIGNEE', 'PROJECT', 'UPDATED']}
        widths={['90px', 'auto', '100px', '120px', '100px', '80px']}
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
      <ScopeBar showing={data.length} total={total} label="Currently re-opened" />
      <ExtendLink main="Load older re-opens" hint="items beyond current view" />
    </div>
  );
}
