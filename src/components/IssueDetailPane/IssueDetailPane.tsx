/**
 * IssueDetailPane — Detail view container (F2.1)
 */
import React, { memo } from 'react';

export const IssueDetailPane = memo(function IssueDetailPane({ issue }: { issue: any }) {
  return (
    <div data-testid="issue-detail-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div data-testid="issue-header" style={{ borderBottom: '1px solid var(--ds-border)', padding: '16px' }}>
        {issue.issue_key}
      </div>
      <div
        data-testid="detail-sections"
        style={{ overflow: 'auto', flex: 1, padding: '16px' }}
      >
        {/* Sections rendered here */}
      </div>
    </div>
  );
});
