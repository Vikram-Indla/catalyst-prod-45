/**
 * CANONICAL — Editable title for all CatalystView* components.
 * Change here → updates all 7 work item types.
 */
import React, { useState } from 'react';
import { IssueIcon } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import type { PhIssue } from '../types';

interface CatalystTitleEditorProps {
  issue: PhIssue | null;
  onTitleChange: (newTitle: string) => void;
}

export function CatalystTitleEditor({ issue, onTitleChange }: CatalystTitleEditorProps) {
  const [titleFocused, setTitleFocused] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
      {issue?.issue_type && (
        <div style={{ marginTop: 6, flexShrink: 0 }}>
          <IssueIcon type={issue.issue_type} size={20} />
        </div>
      )}
      <h1
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setTitleFocused(true)}
        onBlur={e => {
          setTitleFocused(false);
          const newTitle = e.currentTarget.textContent?.trim() ?? '';
          if (newTitle && newTitle !== issue?.summary) {
            onTitleChange(newTitle);
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === 'Escape') { e.currentTarget.textContent = issue?.summary ?? ''; e.currentTarget.blur(); }
        }}
        style={{
          // Jira-measured: Atlassian Sans, 20/653, line-height 1.4, #292A2E
          fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
          fontSize: 20, fontWeight: 653, color: '#292A2E', lineHeight: 1.4,
          margin: 0, outline: 'none', cursor: 'text', borderRadius: 3, flex: 1,
          padding: '4px 6px', wordBreak: 'break-word', transition: 'background 0.15s, box-shadow 0.15s',
          background: titleFocused ? '#FFFFFF' : 'transparent',
          boxShadow: titleFocused ? '0 0 0 2px #4C9AFF' : 'none',
        }}
        onMouseEnter={e => { if (!titleFocused) e.currentTarget.style.background = '#F4F5F7'; }}
        onMouseLeave={e => { if (!titleFocused) e.currentTarget.style.background = 'transparent'; }}
      >
        {issue?.summary ?? '—'}
      </h1>
    </div>
  );
}
