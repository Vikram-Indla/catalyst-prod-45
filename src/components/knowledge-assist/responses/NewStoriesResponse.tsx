import React from 'react';
import { FilePlus, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, ScopeBar, ExtendLink } from './KAResponseShared';
import { useNewStories, useEarlierStories, formatTimeAgo } from './useKAData';

export function NewStoriesResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useNewStories();
  const { data: earlierData, loading: loadingEarlier, loaded: earlierLoaded, loadEarlier } = useEarlierStories();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#2563EB" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>No new stories created in the last 2 weeks.</div>;

  return (
    <div>
      <CardHeader icon={FilePlus} iconColor="#2563EB" title="New Stories" subtitle={`${total} created in last 2 weeks`} />
      <V12Table
        headers={['KEY', 'TITLE', 'PROJECT', 'ASSIGNEE', 'STATUS', 'CREATED']}
        widths={['100px', 'auto', '100px', '120px', '100px', '80px']}
      >
        {data.map(item => (
          <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
            <KeyCell value={item.issue_key} />
            <Cell>{item.summary}</Cell>
            <Cell bold>{item.project_name || item.project_key}</Cell>
            <Cell>{item.assignee_display_name || '—'}</Cell>
            <Cell><span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{item.status}</span></Cell>
            <Cell mono muted>{formatTimeAgo(item.jira_created_at)}</Cell>
          </Row>
        ))}
      </V12Table>
      <ScopeBar showing={data.length} total={total} label="Created in last 2 weeks" />

      {/* Earlier stories */}
      {!earlierLoaded && (
        <ExtendLink
          main="Load earlier stories"
          hint="older items beyond 2 weeks"
          onClick={loadEarlier}
          loading={loadingEarlier}
        />
      )}

      {loadingEarlier && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
          <Loader2 size={14} className="animate-spin" color="#2563EB" />
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Loading earlier stories…</span>
        </div>
      )}

      {earlierLoaded && earlierData.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <CardHeader icon={FilePlus} iconColor="#94A3B8" title="Earlier Stories" subtitle={`${earlierData.length} from 2–6 weeks ago`} />
          <V12Table
            headers={['KEY', 'TITLE', 'PROJECT', 'ASSIGNEE', 'STATUS', 'CREATED']}
            widths={['100px', 'auto', '100px', '120px', '100px', '80px']}
          >
            {earlierData.map(item => (
              <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
                <KeyCell value={item.issue_key} />
                <Cell>{item.summary}</Cell>
                <Cell bold>{item.project_name || item.project_key}</Cell>
                <Cell>{item.assignee_display_name || '—'}</Cell>
                <Cell><span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{item.status}</span></Cell>
                <Cell mono muted>{formatTimeAgo(item.jira_created_at)}</Cell>
              </Row>
            ))}
          </V12Table>
        </div>
      )}

      {earlierLoaded && earlierData.length === 0 && (
        <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--fg-4)' }}>No earlier stories found (2–6 weeks ago).</div>
      )}
    </div>
  );
}
