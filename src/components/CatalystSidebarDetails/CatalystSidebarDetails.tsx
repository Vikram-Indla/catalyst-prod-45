/**
 * CatalystSidebarDetails — Right rail container (F3.1)
 */
import React, { memo } from 'react';

export const CatalystSidebarDetails = memo(function CatalystSidebarDetails({ issue }: { issue: any }) {
  return (
    <div
      data-testid="sidebar-details"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div>Assignee: {issue.assignee || 'Unassigned'}</div>
      <div>Priority: {issue.priority}</div>
      {(issue.issue_type === 'Defect' || issue.issue_type === 'Incident') && (
        <div>Severity: {issue.severity}</div>
      )}
    </div>
  );
});
