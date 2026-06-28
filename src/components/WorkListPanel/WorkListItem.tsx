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
        backgroundColor: isSelected ? 'var(--ds-background-neutral, #F1F2F4)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 150ms',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'var(--ds-shadow-raised, rgba(0, 0, 0, 0.05))';
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
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--ds-text-subtlest, #6B778C)',
            marginBottom: '2px',
          }}
        >
          {item.key}
        </div>
        <div
          dir="auto"
          style={{
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
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
          fontSize: '11px',
          fontWeight: 500,
          padding: '2px 6px',
// TODO: ads-unmapped — #E6EDFA context unclear
          backgroundColor: '#E6EDFA',
          color: 'var(--ds-link, #0C66E4)',
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
