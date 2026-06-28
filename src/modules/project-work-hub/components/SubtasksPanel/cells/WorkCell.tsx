/**
 * WorkCell — issue type icon + key + summary, clickable to open subtask.
 *
 * Split into two atomic parts so the cell function can swap the summary slot
 * for an inline editor while keeping the prefix (icon + key) visible —
 * matches Jira's inline summary edit pattern (2026-06-23, image #134).
 */
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface WorkCellProps {
  issueType?: string | null;
  issueKey?: string | null;
  summary: string;
  onClick?: () => void;
}

const LINE_HEIGHT = 20;

export function WorkCellPrefix({
  issueType,
  issueKey,
  onClick,
}: {
  issueType?: string | null;
  issueKey?: string | null;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sp-work-cell-prefix"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        font: 'inherit',
        color: 'inherit',
        flexShrink: 0,
      }}
    >
      {issueType && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            height: LINE_HEIGHT,
          }}
        >
          <JiraIssueTypeIcon type={issueType} size={16} />
        </span>
      )}
      {issueKey && (
        <span
          style={{
            color: 'var(--ds-link, #0052CC)',
            fontSize: 'var(--ds-font-size-400)',
            flexShrink: 0,
            textDecoration: 'underline',
            textUnderlineOffset: 2,
            lineHeight: `${LINE_HEIGHT}px`,
          }}
        >
          {issueKey}
        </span>
      )}
    </button>
  );
}

export function WorkCellSummary({
  summary,
  onClick,
}: {
  summary: string;
  onClick?: () => void;
}) {
  // 2026-06-23 — onClick lives on the INNER text span, not the outer
  // container. The outer span fills the remaining cell width (flex:1) but
  // clicking its empty padding area must NOT trigger navigation — only
  // clicking on the text itself does. Empty-area clicks bubble to the
  // sp-summary-wrap which opens summary edit mode.
  return (
    <span
      className="sp-work-cell-summary"
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        minWidth: 0,
        flex: 1,
        lineHeight: `${LINE_HEIGHT}px`,
        background: 'transparent',
        padding: 0,
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <span
        className="sp-work-cell-summary-text"
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onClick();
          }
        } : undefined}
        style={{ cursor: onClick ? 'pointer' : 'inherit' }}
      >
        {summary}
      </span>
    </span>
  );
}

export function WorkCell({ issueType, issueKey, summary, onClick }: WorkCellProps) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minWidth: 0,
        width: '100%',
      }}
    >
      <WorkCellPrefix issueType={issueType} issueKey={issueKey} onClick={onClick} />
      <WorkCellSummary summary={summary} onClick={onClick} />
    </span>
  );
}
