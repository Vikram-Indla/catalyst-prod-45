import React from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface ParentEpicChipProps {
  epicId: string;
  epicKey: string | null;
  epicName: string;
}

/**
 * ParentEpicChip — Jira-parity parent chip
 * Purple lightning icon + "KEY Summary" in light blue (#DEEBFF) chip
 */
export const ParentEpicChip: React.FC<ParentEpicChipProps> = ({ epicId, epicKey, epicName }) => {
  const label = epicKey ? `${epicKey} ${epicName}` : epicName;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 10px',
        borderRadius: 4,
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 500,
        maxWidth: 230,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        background: 'var(--ds-background-accent-purple-subtlest)',
        color: 'var(--ds-text-accent-purple)',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      title={label}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-accent-purple-subtler)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--ds-background-accent-purple-subtlest)')}
    >
      <JiraIssueTypeIcon type="epic" size={14} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
};
