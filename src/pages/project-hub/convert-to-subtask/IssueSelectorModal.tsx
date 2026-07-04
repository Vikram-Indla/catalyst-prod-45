/**
 * IssueSelectorModal — Jira-parity parent-issue picker for the
 * Convert-to-Sub-task flow.
 *
 * Layout:
 *   - Fixed backdrop + centered white card with shadow
 *   - Title "Issue Selector" (large heading)
 *   - Card body:
 *       · Radio group: Recent Issues (default) / From Filter
 *       · Dropdown "Please select a value" — disabled unless "From Filter"
 *       · Divider
 *       · Collapsable "Issues you have recently viewed" (expanded)
 *       · Collapsable "First 50 issues from your current search" (collapsed)
 *
 * Each row renders: key + title (blue link colour) · priority icon · status pill,
 * with a bottom border. Clicking a row fires `onSelect(issueKey)` and closes.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

interface IssueSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (issueKey: string) => void;
  projectKey: string;
  currentIssueKey?: string | null;
}

/* ─── Style tokens (ADS only) ────────────────────────────────────────────── */

const backdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--ds-blanket, rgba(9,30,66,.54))',
  zIndex: 4000,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '80px 24px 24px',
  overflowY: 'auto',
};

const modalWrap: React.CSSProperties = {
  width: 640,
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-700)',
  fontWeight: 700,
  color: 'var(--ds-text)',
  padding: '0 4px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--ds-surface-overlay)',
  borderRadius: 6,
  boxShadow: 'var(--ds-shadow-overlay)',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const radioRow: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const radioLabel: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 'var(--ds-font-size-300)',
  color: 'var(--ds-text)',
  cursor: 'pointer',
};

const filterSelectStyle: React.CSSProperties = {
  width: '100%',
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--ds-border-input)',
  borderRadius: 3,
  background: 'var(--ds-surface)',
  fontSize: 'var(--ds-font-size-300)',
  color: 'var(--ds-text)',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--ds-border)',
  margin: '8px 0',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 0',
  cursor: 'pointer',
  fontSize: 'var(--ds-font-size-400)',
  fontWeight: 600,
  color: 'var(--ds-text)',
  background: 'none',
  border: 'none',
  textAlign: 'left',
  width: '100%',
};

const listRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '80px 1fr 24px 100px',
  alignItems: 'center',
  columnGap: 12,
  padding: '10px 4px',
  borderBottom: '1px solid var(--ds-border)',
  cursor: 'pointer',
  color: 'var(--ds-link)',
  fontSize: 'var(--ds-font-size-300)',
  background: 'none',
  border: '0 solid transparent',
  width: '100%',
  textAlign: 'left',
};

const rowKeyStyle: React.CSSProperties = {
  color: 'var(--ds-link)',
  fontWeight: 600,
};

const rowTitleStyle: React.CSSProperties = {
  color: 'var(--ds-link)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

async function fetchIssues(projectKey: string, excludeKey: string | null | undefined, limit: number): Promise<IssueRow[]> {
  const q = supabase
    .from('ph_issues')
    .select('issue_key, summary, status, status_category, priority, issue_type')
    .eq('project_key', projectKey)
    .is('deleted_at', null)
    .order('jira_updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as IssueRow[];
  return rows.filter((r) => {
    if (excludeKey && r.issue_key === excludeKey) return false;
    const t = (r.issue_type ?? '').toLowerCase().trim();
    return !SUBTASK_TYPES.has(t);
  });
}

export function IssueSelectorModal({
  isOpen,
  onClose,
  onSelect,
  projectKey,
  currentIssueKey,
}: IssueSelectorModalProps) {
  const [source, setSource] = useState<'recent' | 'filter'>('recent');
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const { data: recentIssues = [] } = useQuery({
    queryKey: ['convert-selector-recent', projectKey, currentIssueKey],
    enabled: isOpen && !!projectKey,
    staleTime: 30_000,
    queryFn: () => fetchIssues(projectKey, currentIssueKey, 10),
  });

  const { data: searchIssues = [] } = useQuery({
    queryKey: ['convert-selector-search', projectKey, currentIssueKey],
    enabled: isOpen && !!projectKey && searchExpanded,
    staleTime: 30_000,
    queryFn: () => fetchIssues(projectKey, currentIssueKey, 50),
  });

  if (!isOpen) return null;

  const handleRowClick = (key: string) => {
    onSelect(key);
    onClose();
  };

  return createPortal(
    <div style={backdrop} onClick={onClose}>
      <div style={modalWrap} onClick={(e) => e.stopPropagation()}>
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
            {/* Filter options wired in the next iteration. */}
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
                  <IssueRowButton key={r.issue_key} row={r} onClick={handleRowClick} />
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
                  <IssueRowButton key={r.issue_key} row={r} onClick={handleRowClick} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
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
