import React, { useCallback } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, ScopeBar, ExtendLink, F } from './KAResponseShared';
import { useBlockedItems, useLoadAllItems, formatTimeAgo, type KAIssue } from './useKAData';
import { supabase } from '@/integrations/supabase/client';

const FIELDS = 'issue_key, summary, status, status_category, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at';

export function BlockedItemsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useBlockedItems();

  const fetchAllBlocked = useCallback(async () => {
    const { data: items } = await supabase
      .from('ph_issues')
      .select(FIELDS)
      .is('jira_removed_at', null)
      .or('status.ilike.%blocked%,status.ilike.%block%,status.ilike.%impediment%')
      .order('jira_updated_at', { ascending: false })
      .limit(100);
    return (items as KAIssue[]) || [];
  }, []);

  const { data: allData, loading: loadingAll, loaded: allLoaded, loadAll } = useLoadAllItems(fetchAllBlocked);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#DC2626" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No blocked items found.</div>;

  const displayData = allLoaded ? allData : data;

  return (
    <div>
      <CardHeader icon={ShieldAlert} iconColor="#DC2626" title="Blocked Items" titleColor="#DC2626" subtitle={`${total} total`} />
      <V12Table
        headers={['KEY', 'TITLE', 'ASSIGNEE', 'PROJECT', 'TYPE', 'BLOCKED SINCE']}
        widths={['90px', 'auto', '120px', '100px', '80px', '90px']}
      >
        {displayData.map(item => (
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
      <ScopeBar showing={displayData.length} total={total} label="Currently blocked" />
      {!allLoaded && total > data.length && (
        <ExtendLink main="Show all blocked items" hint={`${total} items total`} onClick={loadAll} loading={loadingAll} />
      )}
      {loadingAll && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
          <Loader2 size={14} className="animate-spin" color="#DC2626" />
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>Loading all blocked items…</span>
        </div>
      )}
    </div>
  );
}
