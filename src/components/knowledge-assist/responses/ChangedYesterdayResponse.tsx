import React, { useCallback } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink, F } from './KAResponseShared';
import { useChangedYesterday, useLoadAllItems, formatTimeAgo, type KAIssue } from './useKAData';
import { supabase } from '@/integrations/supabase/client';

const FIELDS = 'issue_key, summary, status, status_category, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at';

export function ChangedYesterdayResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useChangedYesterday();

  const fetchAll = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: items } = await supabase
      .from('ph_issues')
      .select(FIELDS)
      .is('jira_removed_at', null)
      .gte('jira_updated_at', since)
      .order('jira_updated_at', { ascending: false })
      .limit(100);
    return (items as KAIssue[]) || [];
  }, []);

  const { data: allData, loading: loadingAll, loaded: allLoaded, loadAll } = useLoadAllItems(fetchAll);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#2563EB" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>No changes found in the last 24 hours.</div>;

  const displayData = allLoaded ? allData : data;

  return (
    <div>
      <CardHeader icon={CalendarDays} iconColor="#2563EB" title="Changes Since Yesterday" subtitle={`${total} items updated`} />
      <V12Table
        headers={['KEY', 'TITLE', 'STATUS', 'ASSIGNEE', 'PROJECT', 'WHEN']}
        widths={['100px', 'auto', '120px', '120px', '100px', '80px']}
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
      <ScopeBar showing={displayData.length} total={total} label="Since yesterday" />
      {!allLoaded && total > data.length && (
        <ExtendLink main="Show full activity log" hint={`${total} items in last 24 hours`} onClick={loadAll} loading={loadingAll} />
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
