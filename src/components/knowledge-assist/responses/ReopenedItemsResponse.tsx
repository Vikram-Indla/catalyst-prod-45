import React, { useCallback } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink, F } from './KAResponseShared';
import { useReopenedItems, useLoadAllItems, formatTimeAgo, type KAIssue } from './useKAData';
import { supabase } from '@/integrations/supabase/client';

const FIELDS = 'issue_key, summary, status, status_category, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at';

export function ReopenedItemsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useReopenedItems();

  const fetchAll = useCallback(async () => {
    const { data: items } = await supabase
      .from('ph_issues')
      .select(FIELDS)
      .is('jira_removed_at', null)
      .or('status.ilike.%re-open%,status.ilike.%reopen%,status.ilike.%re open%')
      .order('jira_updated_at', { ascending: false })
      .limit(100);
    return (items as KAIssue[]) || [];
  }, []);

  const { data: allData, loading: loadingAll, loaded: allLoaded, loadAll } = useLoadAllItems(fetchAll);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#D97706" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>No re-opened items found.</div>;

  const displayData = allLoaded ? allData : data;

  return (
    <div>
      <CardHeader icon={RotateCcw} iconColor="#D97706" title="Re-opened Items" titleColor="#D97706" subtitle={`${total} bounced back`} />
      <V12Table
        headers={['KEY', 'TITLE', 'STATUS', 'ASSIGNEE', 'PROJECT', 'UPDATED']}
        widths={['90px', 'auto', '100px', '120px', '100px', '80px']}
      >
        {displayData.map(item => (
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
      <ScopeBar showing={displayData.length} total={total} label="Currently re-opened" />
      {!allLoaded && total > data.length && (
        <ExtendLink main="Load older re-opens" hint="items beyond current view" onClick={loadAll} loading={loadingAll} />
      )}
      {loadingAll && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
          <Loader2 size={14} className="animate-spin" color="#D97706" />
          <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: F.inter }}>Loading…</span>
        </div>
      )}
    </div>
  );
}
