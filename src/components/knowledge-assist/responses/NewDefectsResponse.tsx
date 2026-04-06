import React, { useCallback } from 'react';
import { Bug, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink, F } from './KAResponseShared';
import { useNewDefects, useLoadAllItems, formatTimeAgo, type KAIssue } from './useKAData';
import { supabase } from '@/integrations/supabase/client';

const FIELDS = 'issue_key, summary, status, status_category, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at';

export function NewDefectsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useNewDefects();

  const fetchOlder = useCallback(async () => {
    const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: items } = await supabase
      .from('ph_issues')
      .select(FIELDS)
      .is('jira_removed_at', null)
      .or('issue_type.ilike.%bug%,issue_type.ilike.%defect%')
      .gte('jira_created_at', sixWeeksAgo)
      .lt('jira_created_at', twoWeeksAgo)
      .order('jira_created_at', { ascending: false })
      .limit(50);
    return (items as KAIssue[]) || [];
  }, []);

  const { data: olderData, loading: loadingOlder, loaded: olderLoaded, loadAll } = useLoadAllItems(fetchOlder);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#DC2626" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>No new defects logged in the last 2 weeks.</div>;

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
      {!olderLoaded && (
        <ExtendLink main="Load older defects" hint="items beyond 2 weeks" onClick={loadAll} loading={loadingOlder} />
      )}
      {loadingOlder && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
          <Loader2 size={14} className="animate-spin" color="#DC2626" />
          <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: F.inter }}>Loading older defects…</span>
        </div>
      )}
      {olderLoaded && olderData.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <CardHeader icon={Bug} iconColor="#94A3B8" title="Earlier Defects" subtitle={`${olderData.length} from 2–6 weeks ago`} />
          <V12Table
            headers={['KEY', 'TITLE', 'PRIORITY', 'PROJECT', 'REPORTED BY', 'ASSIGNEE', 'LOGGED']}
            widths={['90px', 'auto', '70px', '90px', '110px', '110px', '70px']}
          >
            {olderData.map(item => (
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
        </div>
      )}
      {olderLoaded && olderData.length === 0 && (
        <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--fg-4)' }}>No older defects found (2–6 weeks ago).</div>
      )}
    </div>
  );
}
