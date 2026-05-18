/**
 * WorkCard — Individual work item row (F1.3)
 *
 * Displays: Type icon + Key + Summary + Status + Parent
 */
import React, { memo } from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export interface WorkCardItem {
  id: string;
  key: string;
  issueType: string;
  summary: string;
  status: string;
  statusCategory: 'todo' | 'inprogress' | 'done' | 'default';
  parentKey?: string | null;
  parentSummary?: string | null;
}

interface WorkCardProps {
  item: WorkCardItem;
  isSelected: boolean;
  onClick: (key: string) => void;
}

const statusCategoryColor: Record<
  'todo' | 'inprogress' | 'done' | 'default',
  string
> = {
  todo: 'rgba(5,21,36,0.06)', // Light grey
  inprogress: '#669DF1', // Blue
  done: '#94C748', // Green
  default: 'rgba(5,21,36,0.06)',
};

const statusCategoryTextColor: Record<
  'todo' | 'inprogress' | 'done' | 'default',
  string
> = {
  todo: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))', // Dark grey
  inprogress: '#FFFFFF', // White
  done: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))', // Dark
  default: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
};

export const WorkCard = memo(function WorkCard({
  item,
  isSelected,
  onClick,
}: WorkCardProps) {
  const handleClick = () => {
    onClick(item.key);
  };

  return (
    <button
      onClick={handleClick}
      data-testid="work-card"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        border: 'none',
        cursor: 'pointer',
        background: isSelected
          ? 'var(--ds-background-selected, #DEEBFF)'
          : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
        borderBottom: '1px solid var(--ds-border, #EBECF0)',
        textAlign: 'left',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isSelected
          ? 'var(--ds-background-selected, #DEEBFF)'
          : 'var(--ds-surface-hovered, #F4F5F7)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isSelected
          ? 'var(--ds-background-selected, #DEEBFF)'
          : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))';
      }}
    >
      {/* First line: Type icon + Key + Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Type icon */}
        <div
          data-testid="work-card-type-icon"
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <JiraIssueTypeIcon type={item.issueType} size={14} />
        </div>

        {/* Key */}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--ds-link, #0055CC)',
            fontFamily: 'var(--cp-font-mono)',
            flexShrink: 0,
          }}
        >
          {item.key}
        </span>

        {/* Status pill */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 6px',
            borderRadius: '3px',
            background: statusCategoryColor[item.statusCategory],
            color: statusCategoryTextColor[item.statusCategory],
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.165px',
            marginLeft: 'auto',
            flexShrink: 0,
          }}
        >
          {item.status}
        </span>
      </div>

      {/* Second line: Summary */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))',
          lineHeight: '16px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        {item.summary}
      </div>

      {/* Third line: Parent (if present) */}
      {item.parentKey && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--ds-text-subtlest, #626F86)',
            lineHeight: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          Parent:{' '}
          <span
            style={{
              color: 'var(--ds-link, #0055CC)',
              fontWeight: 500,
              fontFamily: 'var(--cp-font-mono)',
            }}
          >
            {item.parentKey}
          </span>
        </div>
      )}
    </button>
  );
});
