/**
 * KeyDetailsSection — Key details section (F2.5)
 */
import React, { memo } from 'react';

export const KeyDetailsSection = memo(function KeyDetailsSection({ issue }: { issue: any }) {
  return (
    <div>
      <h2>Key Details</h2>
      <div><span data-testid="key-icon">🔑</span>{issue.issue_key}</div>
      {issue.parent_key && <div><span data-testid="parent-icon">📌</span>{issue.parent_key}</div>}
      {issue.priority && <div><span data-testid="priority-icon">⚡</span>Priority: {issue.priority}</div>}
      {(issue.issue_type === 'Defect' || issue.issue_type === 'Incident') && issue.severity && (
        <div><span data-testid="severity-icon">⚠️</span>{issue.severity}</div>
      )}
    </div>
  );
});
