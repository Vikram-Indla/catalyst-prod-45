import React from 'react';
import { User, Loader2 } from 'lucide-react';
import { V12Table, Row, KeyCell, Cell, Loz, AgeingDot, ScopeBar, ExtendLink, F } from './KAResponseShared';
import { usePersonWork, formatTimeAgo } from './useKAData';

export function PersonWorkResponse({ onItemClick, namePattern = '' }: { onItemClick?: (key: string) => void; namePattern?: string }) {
  const { data, total, personName, loading } = usePersonWork(namePattern || 'Wahid');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#2563EB" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No active items found for this person.</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <User size={16} strokeWidth={2} color="#2563EB" />
          <span style={{ fontFamily: F.sora, fontSize: 14, fontWeight: 650, color: '#0F172A' }}>{personName}</span>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 12, color: '#64748B' }}>📁 {total} active items</span>
      </div>
      <V12Table
        headers={['KEY', 'TYPE', 'TITLE', 'STATUS', 'PROJECT', 'UPDATED']}
        widths={['90px', '70px', 'auto', '100px', '100px', '80px']}
      >
        {data.map(item => (
          <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
            <KeyCell value={item.issue_key} />
            <Cell muted>{item.issue_type}</Cell>
            <Cell>{item.summary}</Cell>
            <Cell><Loz status={item.status} /></Cell>
            <Cell bold>{item.project_name || item.project_key}</Cell>
            <Cell mono muted>{formatTimeAgo(item.jira_updated_at)}</Cell>
          </Row>
        ))}
      </V12Table>
      <ScopeBar showing={data.length} total={total} label="Active items" />
      <ExtendLink main="Load older items" hint={`${total} items total`} />
    </div>
  );
}
