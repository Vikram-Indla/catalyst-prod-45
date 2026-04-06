/**
 * Source Tag — JIRA (blue) or CAT (teal)
 */
import React from 'react';
import type { IssueSource } from '@/types/project-hub.types';

interface Props {
  source: IssueSource;
}

export function PHSourceTag({ source }: Props) {
  const isJira = source === 'jira';
  return (
    <span
      className="inline-flex items-center font-bold uppercase flex-shrink-0"
      style={{
        fontSize: 8,
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 4,
        letterSpacing: '0.5px',
        background: isJira ? 'var(--cp-blue-wash)' : 'var(--sem-success-bg)',
        color: isJira ? 'var(--cp-blue)' : 'var(--sem-success)',
      }}
    >
      {isJira ? 'JIRA' : 'CAT'}
    </span>
  );
}
