/**
 * TicketPicker — inline popover triggered by # in the editor.
 * Queries ph_issues for issue_key / summary matches, keyboard navigable,
 * calls onSelect with the chosen issue data.
 * Mirrors MentionPicker structure exactly.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export interface TicketPickerIssue {
  issue_key: string;
  issue_type: string;
  summary: string | null;
}

interface Props {
  query: string;
  coords: { left: number; top: number; bottom: number };
  onSelect: (issue: TicketPickerIssue) => void;
  onDismiss: () => void;
}

export function TicketPicker({ query, coords, onSelect, onDismiss }: Props) {
  const [issues, setIssues] = useState<TicketPickerIssue[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!query) {
      setIssues([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, issue_type, summary')
        .or(`issue_key.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(8);
      if (cancelled || error) return;
      setIssues((data ?? []) as TicketPickerIssue[]);
      setActiveIdx(0);
    })();
    return () => { cancelled = true; };
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => issues.length === 0 ? 0 : (i + 1) % issues.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => issues.length === 0 ? 0 : (i - 1 + issues.length) % issues.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const issue = issues[activeIdx];
        if (issue) {
          e.preventDefault();
          onSelect(issue);
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [issues, activeIdx, onSelect, onDismiss]);

  if (issues.length === 0) return null;

  const top = coords.bottom + 4;
  const left = coords.left;

  return createPortal(
    <div
      data-testid="ticket-picker"
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 10000,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 4,
        boxShadow: '0 4px 12px var(--ds-shadow-raised, rgba(9,30,66,0.15))',
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      {issues.map((issue, idx) => (
        <button
          key={issue.issue_key}
          type="button"
          data-testid={`ticket-picker-item-${issue.issue_key}`}
          onClick={() => onSelect(issue)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 8px',
            border: 'none',
            background: idx === activeIdx
              ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'
              : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <JiraIssueTypeIcon type={issue.issue_type} size={14} />
          <span style={{ fontWeight: 500, color: 'var(--ds-link)', fontSize: 'var(--ds-font-size-300)', minWidth: 64 }}>
            {issue.issue_key}
          </span>
          <span style={{
            fontSize: 'var(--ds-font-size-300)',
            color: 'var(--ds-text-subtle)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {issue.summary ?? ''}
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
