/**
 * IssueSelectorPopupPage — full-page variant of the Jira "Issue Selector"
 * popup. Opened via `window.open(...)` from the Convert-to-Sub-task wizard.
 *
 * Route: /project-hub/:key/issue-selector?source=<sourceIssueKey>
 *
 * On row select the popup fires `window.opener.postMessage({ type:
 * 'CONVERT_PARENT_SELECT', issueKey })` and closes itself. The opener
 * listens and stores the pick.
 */
import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import { supabase } from '@/integrations/supabase/client';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { PriorityIcon } from '@/components/icons/PriorityIcon';

const SUBTASK_TYPES = new Set(['sub-task', 'subtask', 'backend', 'frontend', 'integration']);

interface IssueRow {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  priority: string | null;
  issue_type: string | null;
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  padding: '24px 32px',
  background: 'var(--ds-surface)',
  color: 'var(--ds-text)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-700)',
  fontWeight: 700,
  color: 'var(--ds-text)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--ds-surface-overlay)',
  borderRadius: 6,
  boxShadow: 'var(--ds-shadow-overlay)',
  padding: 'var(--ds-space-250) var(--ds-space-300)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const radioRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const radioLabel: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', cursor: 'pointer',
};
const filterSelectStyle: React.CSSProperties = {
  width: 260, height: 32, padding: '0 8px',
  border: '1px solid var(--ds-border-input)', borderRadius: 3,
  background: 'var(--ds-surface)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)',
};
const dividerStyle: React.CSSProperties = { height: 1, background: 'var(--ds-border)', margin: '8px 0' };
const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '4px 0', cursor: 'pointer',
  fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)',
  background: 'none', border: 'none', textAlign: 'left', width: '100%',
};
const listRowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '70px 1fr 20px 90px',
  alignItems: 'center', columnGap: 10,
  padding: 'var(--ds-space-075) var(--ds-space-050)', borderBottom: '1px solid var(--ds-border)',
  cursor: 'pointer', background: 'none', border: '0 solid transparent',
  width: '100%', textAlign: 'left',
  fontSize: 'var(--ds-font-size-200)',
};
const rowKeyStyle: React.CSSProperties = {
  color: 'var(--ds-link)', fontWeight: 400,
  fontSize: 'var(--ds-font-size-200)',
};
const rowTitleStyle: React.CSSProperties = {
  color: 'var(--ds-link)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  fontSize: 'var(--ds-font-size-200)',
};

async function fetchIssues(projectKey: string, excludeKey: string | null, limit: number): Promise<IssueRow[]> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select('issue_key, summary, status, status_category, priority, issue_type')
    .eq('project_key', projectKey)
    .is('deleted_at', null)
    .order('jira_updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data as IssueRow[] ?? []).filter((r) => {
    if (excludeKey && r.issue_key === excludeKey) return false;
    const t = (r.issue_type ?? '').toLowerCase().trim();
    return !SUBTASK_TYPES.has(t);
  });
}

export default function IssueSelectorPopupPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const [searchParams] = useSearchParams();
  const sourceIssueKey = searchParams.get('source');

  const [source, setSource] = useState<'recent' | 'filter'>('recent');
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const { data: recentIssues = [] } = useQuery({
    queryKey: ['convert-selector-popup-recent', projectKey, sourceIssueKey],
    enabled: !!projectKey,
    staleTime: 30_000,
    queryFn: () => fetchIssues(projectKey!, sourceIssueKey, 10),
  });

  const { data: searchIssues = [] } = useQuery({
    queryKey: ['convert-selector-popup-search', projectKey, sourceIssueKey],
    enabled: !!projectKey && searchExpanded,
    staleTime: 30_000,
    queryFn: () => fetchIssues(projectKey!, sourceIssueKey, 50),
  });

  const { data: filters = [] } = useQuery({
    queryKey: ['convert-selector-popup-filters', projectKey],
    enabled: !!projectKey,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('ph_saved_filters')
        .select('id, name, project_key')
        .eq('project_key', projectKey)
        .order('name', { ascending: true })
        .limit(200);
      return (data ?? []) as Array<{ id: string; name: string; project_key: string | null }>;
    },
  });

  const handlePick = (issueKey: string) => {
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'CONVERT_PARENT_SELECT', issueKey }, window.location.origin);
      }
    } catch { /* fall through — window.close still runs */ }
    window.close();
  };

  return (
    <div style={pageStyle}>
      <div style={titleStyle}>Issue Selector</div>

      <div style={cardStyle}>
        <div style={radioRow}>
          <label style={radioLabel}>
            <input
              type="radio"
              name="issue-source"
              checked={source === 'recent'}
              onChange={() => setSource('recent')}
            />
            Recent Issues
          </label>
          <label style={radioLabel}>
            <input
              type="radio"
              name="issue-source"
              checked={source === 'filter'}
              onChange={() => setSource('filter')}
            />
            From Filter
          </label>
        </div>

        <select
          style={{ ...filterSelectStyle, opacity: source === 'filter' ? 1 : 0.6 }}
          disabled={source !== 'filter'}
          defaultValue=""
        >
          <option value="" disabled>Please select a value</option>
          {filters.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <div style={dividerStyle} />

        <button
          type="button"
          style={sectionHeaderStyle}
          onClick={() => setRecentExpanded((v) => !v)}
          aria-expanded={recentExpanded}
        >
          {recentExpanded ? <ChevronDownIcon label="" /> : <ChevronRightIcon label="" />}
          <span>Issues you have recently viewed</span>
        </button>
        {recentExpanded && (
          <div>
            {recentIssues.length === 0 ? (
              <div style={{ padding: 12, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>
                No recent issues in this project.
              </div>
            ) : (
              recentIssues.map((r) => (
                <IssueRowButton key={r.issue_key} row={r} onClick={handlePick} />
              ))
            )}
          </div>
        )}

        <button
          type="button"
          style={sectionHeaderStyle}
          onClick={() => setSearchExpanded((v) => !v)}
          aria-expanded={searchExpanded}
        >
          {searchExpanded ? <ChevronDownIcon label="" /> : <ChevronRightIcon label="" />}
          <span>First 50 issues from your current search</span>
        </button>
        {searchExpanded && (
          <div>
            {searchIssues.length === 0 ? (
              <div style={{ padding: 12, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>
                No results.
              </div>
            ) : (
              searchIssues.map((r) => (
                <IssueRowButton key={r.issue_key} row={r} onClick={handlePick} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueRowButton({ row, onClick }: { row: IssueRow; onClick: (key: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(row.issue_key)}
      style={listRowStyle}
    >
      <span style={rowKeyStyle}>{row.issue_key}</span>
      <span style={rowTitleStyle}>{row.summary}</span>
      <span aria-hidden="true" style={{ display: 'inline-flex' }}>
        {row.priority && <PriorityIcon level={row.priority} size={16} />}
      </span>
      <span style={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
        <StatusLozenge status={row.status} statusCategory={row.status_category} size="sm" />
      </span>
    </button>
  );
}
