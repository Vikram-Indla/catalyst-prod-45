import React from 'react';
import Button from '@atlaskit/button/new';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import AddIcon from '@atlaskit/icon/glyph/add';
import Spinner from '@atlaskit/spinner';

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
          iconBefore={<RefreshIcon label="Refresh" size="small" />}
          onClick={onRefresh}
          aria-label="Refresh issue list"
        >
          Refresh
        </Button>
        {onCreateIssue && (
          <Button
            appearance="primary"
            iconBefore={<AddIcon label="Create" size="small" />}
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
