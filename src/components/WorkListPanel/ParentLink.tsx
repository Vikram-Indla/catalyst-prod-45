/**
 * ParentLink — Parent issue reference with type icon (F1.5)
 *
 * Displays parent type icon + clickable key.
 * Used in WorkCard and detail views for parent navigation.
 */
import React, { memo } from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export interface ParentLinkProps {
  parentKey: string;
  parentType: string;
  onClick: (parentKey: string) => void;
}

export const ParentLink = memo(function ParentLink({
  parentKey,
  parentType,
  onClick,
}: ParentLinkProps) {
  const handleClick = () => {
    onClick(parentKey);
  };

  return (
    <div
      data-testid="parent-link-wrapper"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <div
        data-testid="parent-link-icon"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <JiraIssueTypeIcon type={parentType} size={16} />
      </div>

      <button
        onClick={handleClick}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--ds-link, #0C66E4)',
          fontSize: '12px',
          fontWeight: 500,
          fontFamily: 'var(--cp-font-mono)',
          cursor: 'pointer',
          padding: 0,
          textDecoration: 'none',
          transition: 'color 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--ds-link, #0C66E4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--ds-link, #0C66E4)';
        }}
      >
        {parentKey}
      </button>
    </div>
  );
});
