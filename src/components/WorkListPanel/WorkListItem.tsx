/**
 * WorkListItem — Single work item row renderer (F1.15)
 *
 * Renders key, summary, type icon, and status in a clickable row.
 */
import React, { memo } from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export interface WorkListItemProps {
  item: {
    id: string;
    key: string;
    summary: string;
    issueType: string;
    status: string;
  };
  isSelected: boolean;
  onSelect: (key: string) => void;
}

export const WorkListItem = memo(function WorkListItem({
  item,
  isSelected,
  onSelect,
}: WorkListItemProps) {
  return (
    <button
      data-testid="work-list-item"
      onClick={() => onSelect(item.key)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        width: '100%',
        border: 'none',
        backgroundColor: isSelected ? 'var(--ds-background-neutral)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 150ms',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'var(--ds-surface-hovered)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <div
        data-testid="work-item-icon"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          flexShrink: 0,
        }}
      >
        <JiraIssueTypeIcon type={item.issueType} size={14} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 500,
            color: 'var(--ds-text-subtlest)',
            marginBottom: '4px',
          }}
        >
          {item.key}
        </div>
        <div
          dir="auto"
          style={{
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: 400,
            color: 'var(--ds-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.summary}
        </div>
      </div>

      <div
        style={{
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 500,
          padding: '4px 8px',
          backgroundColor: 'var(--ds-background-information)',
          color: 'var(--ds-text-information)',
          borderRadius: '3px',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {item.status}
      </div>
    </button>
  );
});
