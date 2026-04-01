import React, { useCallback } from 'react';
import { User, Loader2 } from 'lucide-react';
import { V12Table, Row, KeyCell, Cell, Loz, AgeingDot, ScopeBar, ExtendLink, F } from './KAResponseShared';
import { usePersonWork, useLoadAllItems, formatTimeAgo, type KAIssue } from './useKAData';
import { supabase } from '@/integrations/supabase/client';

const FIELDS = 'issue_key, summary, status, status_category, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at';

export function PersonWorkResponse({ onItemClick, namePattern = '' }: { onItemClick?: (key: string) => void; namePattern?: string }) {
  const { data, total, personName, loading } = usePersonWork(namePattern || 'Wahid');

  const fetchAll = useCallback(async () => {
    const { data: items } = await supabase
      .from('ph_issues')
      .select(FIELDS)
      .is('jira_removed_at', null)
      .ilike('assignee_display_name', `%${namePattern || 'Wahid'}%`)
      .not('status', 'ilike', '%done%')
      .not('status', 'ilike', '%closed%')
      .order('jira_updated_at', { ascending: false })
      .limit(100);
    return (items as KAIssue[]) || [];
  }, [namePattern]);

  const { data: allData, loading: loadingAll, loaded: allLoaded, loadAll } = useLoadAllItems(fetchAll);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#2563EB" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>No active items found for this person.</div>;

  const displayData = allLoaded ? allData : data;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <User size={16} strokeWidth={2} color="#2563EB" />
          <span style={{ fontFamily: F.sora, fontSize: 14, fontWeight: 650, color: 'var(--fg-1)' }}>{personName}</span>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 12, color: 'var(--fg-3)' }}>📁 {total} active items</span>
      </div>
      <V12Table
        headers={['KEY', 'TYPE', 'TITLE', 'STATUS', 'PROJECT', 'UPDATED']}
        widths={['90px', '70px', 'auto', '100px', '100px', '80px']}
      >
        {displayData.map(item => (
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
      <ScopeBar showing={displayData.length} total={total} label="Active items" />
      {!allLoaded && total > data.length && (
        <ExtendLink main="Load older items" hint={`${total} items total`} onClick={loadAll} loading={loadingAll} />
      )}
      {loadingAll && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
          <Loader2 size={14} className="animate-spin" color="#2563EB" />
          <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: F.inter }}>Loading…</span>
        </div>
      )}
    </div>
  );
}
