/**
 * WorkCell — issue type icon + key + summary, clickable to open subtask.
 */
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface WorkCellProps {
  issueType?: string | null;
  issueKey?: string | null;
  summary: string;
  onClick?: () => void;
}

export function WorkCell({ issueType, issueKey, summary, onClick }: WorkCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sp-work-cell"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        minWidth: 0,
      }}
    >
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>
        <JiraIssueTypeIcon type={issueType || 'task'} size={16} />
      </span>
      {issueKey && (
        <span style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12, flexShrink: 0 }}>{issueKey}</span>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {summary}
      </span>
    </button>
  );
}
