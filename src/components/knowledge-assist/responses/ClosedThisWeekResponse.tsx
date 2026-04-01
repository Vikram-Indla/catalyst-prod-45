import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, ScopeBar, ExtendLink, F } from './KAResponseShared';
import { useClosedItems, useEarlierClosures, formatTimeAgo } from './useKAData';

export function ClosedThisWeekResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  const { data, total, loading } = useClosedItems();
  const { data: earlierData, loading: loadingEarlier, loaded: earlierLoaded, loadEarlier } = useEarlierClosures();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#16A34A" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>No items closed recently.</div>;

  return (
    <div>
      <CardHeader icon={CheckCircle} iconColor="#16A34A" title="Closed Recently" titleColor="#16A34A" subtitle={`${total} resolved`} />
      <V12Table
        headers={['KEY', 'TITLE', 'TYPE', 'PROJECT', 'ASSIGNEE', 'CLOSED']}
        widths={['90px', 'auto', '80px', '100px', '120px', '80px']}
      >
        {data.map(item => (
          <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
            <KeyCell value={item.issue_key} />
            <Cell>{item.summary}</Cell>
            <Cell muted>{item.issue_type}</Cell>
            <Cell bold>{item.project_name || item.project_key}</Cell>
            <Cell>{item.assignee_display_name || '—'}</Cell>
            <Cell mono muted>{formatTimeAgo(item.jira_updated_at)}</Cell>
          </Row>
        ))}
      </V12Table>
      <ScopeBar showing={data.length} total={total} label="Closed in last 2 weeks" />

      {/* Earlier closures */}
      {!earlierLoaded && (
        <div onClick={loadEarlier} style={{ cursor: loadingEarlier ? 'wait' : 'pointer' }}>
          {loadingEarlier ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
              <Loader2 size={14} className="animate-spin" color="#2563EB" />
              <span style={{ fontSize: 12, color: 'var(--cp-blue)', fontFamily: F.inter }}>Loading earlier closures…</span>
            </div>
          ) : (
            <ExtendLink main="Load earlier closures" hint="items from 2–6 weeks ago" />
          )}
        </div>
      )}

      {earlierLoaded && earlierData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, padding: '0 4px' }}>
            EARLIER CLOSURES (2–6 WEEKS AGO)
          </div>
          <V12Table
            headers={['KEY', 'TITLE', 'TYPE', 'PROJECT', 'ASSIGNEE', 'CLOSED']}
            widths={['90px', 'auto', '80px', '100px', '120px', '80px']}
          >
            {earlierData.map(item => (
              <Row key={item.issue_key} onClick={() => onItemClick?.(item.issue_key)}>
                <KeyCell value={item.issue_key} />
                <Cell>{item.summary}</Cell>
                <Cell muted>{item.issue_type}</Cell>
                <Cell bold>{item.project_name || item.project_key}</Cell>
                <Cell>{item.assignee_display_name || '—'}</Cell>
                <Cell mono muted>{formatTimeAgo(item.jira_updated_at)}</Cell>
              </Row>
            ))}
          </V12Table>
        </div>
      )}

      {earlierLoaded && earlierData.length === 0 && (
        <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--fg-3)', textAlign: 'center' }}>
          No earlier closures found (2–6 weeks ago).
        </div>
      )}
    </div>
  );
}
