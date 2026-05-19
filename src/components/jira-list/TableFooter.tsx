import React from 'react';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';

function RefreshIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
function AddIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}

interface TableFooterProps {
  totalIssues: number;
  loadedIssues: number;
  isLoading: boolean;
  onRefresh: () => void;
  onCreateIssue?: () => void;
}

/** Footer: issue count + refresh + optional create action. */
export function TableFooter({ totalIssues, loadedIssues, isLoading, onRefresh, onCreateIssue }: TableFooterProps) {
  return (
    <div className="catalyst-jira-list-footer">
      <span className="catalyst-jira-list-footer__count">
        {isLoading
          ? <><Spinner size="small" /> Loading…</>
          : `${loadedIssues.toLocaleString()} of ${totalIssues.toLocaleString()} issues`
        }
      </span>
      <div className="catalyst-jira-list-footer__actions">
        <Button
          appearance="subtle"
          iconBefore={() => <RefreshIcon />}
          onClick={onRefresh}
          aria-label="Refresh issue list"
        >
          Refresh
        </Button>
        {onCreateIssue && (
          <Button
            appearance="primary"
            iconBefore={() => <AddIcon />}
            onClick={onCreateIssue}
            aria-label="Create new issue"
          >
            Create
          </Button>
        )}
      </div>
    </div>
  );
}
