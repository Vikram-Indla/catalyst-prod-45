import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import type { JiraIssue } from './jira-list.types';
import { categoryToLozengeAppearance } from './jira-list.utils';

interface MobileIssueCardProps {
  issue: JiraIssue;
  onOpen: (key: string) => void;
}

/** Mobile (<480px) card view for a single issue. Table is hidden via CSS at this breakpoint. */
export function MobileIssueCard({ issue, onOpen }: MobileIssueCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(issue.key)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(issue.key); }}
      style={{
        background: 'var(--ds-surface, #ffffff)',
        border: '1px solid var(--ds-border, #dfe1e6)',
        borderRadius: 3,
        padding: '16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      aria-label={`Issue ${issue.key}: ${issue.summary}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WorkItemTypeIcon type={issue.issueType.name} size={16} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-link, #0c66e4)' }}>
          {issue.key}
        </span>
        <Lozenge appearance={categoryToLozengeAppearance(issue.status.statusCategory.key)}>
          {issue.status.name}
        </Lozenge>
      </div>
      <div style={{ fontSize: 14, color: 'var(--ds-text, #172b4d)', fontWeight: 400 }}>
        {issue.summary}
      </div>
      {issue.parent && (
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546f)' }}>
          Parent: {issue.parent.key}
        </div>
      )}
    </div>
  );
}
