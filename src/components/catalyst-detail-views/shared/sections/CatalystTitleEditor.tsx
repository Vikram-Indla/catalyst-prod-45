/**
 * CANONICAL — Editable title for all CatalystView* components.
 * Change here → updates all 7 work item types.
 */
import React, { useState } from 'react';
import type { PhIssue } from '../types';

interface CatalystTitleEditorProps {
  issue: PhIssue | null;
  onTitleChange: (newTitle: string) => void;
}

export function CatalystTitleEditor({ issue, onTitleChange }: CatalystTitleEditorProps) {
  const [titleFocused, setTitleFocused] = useState(false);

  return (
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
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 22, fontWeight: 700, color: '#172B4D', lineHeight: 1.3,
        margin: '0 0 12px', outline: 'none', cursor: 'text', borderRadius: 3,
        padding: '4px 6px', wordBreak: 'break-word', transition: 'background 0.15s, box-shadow 0.15s',
        background: titleFocused ? '#FFFFFF' : 'transparent',
        boxShadow: titleFocused ? '0 0 0 2px #4C9AFF' : 'none',
      }}
      onMouseEnter={e => { if (!titleFocused) e.currentTarget.style.background = '#F4F5F7'; }}
      onMouseLeave={e => { if (!titleFocused) e.currentTarget.style.background = 'transparent'; }}
    >
      {issue?.summary ?? '—'}
    </h1>
  );
}
