/**
 * IssueViewShell — 2-column layout matching Jira Cloud:
 * Left: issue list | Right: issue view (content + collapsible Details sidebar)
 */
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useIssueViewData } from '@/hooks/workhub/useIssueViewData';
import { IssueListPanel } from './IssueListPanel';
import { IssueContentView } from './IssueContentView';

interface Props {
  projectKey: string;
  storageKey: string;
}

export function IssueViewShell({ projectKey, storageKey }: Props) {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(
    searchParams.get('selectedIssue'),
  );
  const [searchQuery, setSearchQuery] = useState('');

  const {
    items, itemsLoading, selectedItem, parentItem,
    children, childrenLoading, links, linksLoading,
    comments, commentsLoading, history, historyLoading, createComment,
  } = useIssueViewData(projectKey, selectedIssueKey, searchQuery);

  // Auto-select first
  useEffect(() => {
    if (!selectedIssueKey && items.length > 0 && !itemsLoading) {
      const key = items[0].issue_key;
      setSelectedIssueKey(key);
      setSearchParams(p => { p.set('selectedIssue', key); return p; }, { replace: true });
    }
  }, [items, selectedIssueKey, itemsLoading]);

  const handleSelect = useCallback((key: string) => {
    setSelectedIssueKey(key);
    setSearchParams(p => { p.set('selectedIssue', key); return p; });
  }, [setSearchParams]);

  return (
    <div className={`awShell ${isDark ? 'dark' : ''}`}>
      {/* Left: issue list */}
      <div className="awCol">
        <IssueListPanel
          projectKey={projectKey}
          selectedIssueKey={selectedIssueKey}
          onSelectIssue={handleSelect}
          onSearch={setSearchQuery}
          items={items}
          loading={itemsLoading}
        />
      </div>

      {/* Divider */}
      <div className="awDivider" />

      {/* Right: issue view (content + collapsible details sidebar) */}
      <div className="awCol">
        <IssueContentView
          issueKey={selectedIssueKey}
          item={selectedItem}
          parentItem={parentItem}
          childItems={children}
          childrenLoading={childrenLoading}
          links={links}
          linksLoading={linksLoading}
          comments={comments}
          commentsLoading={commentsLoading}
          historyItems={history}
          historyLoading={historyLoading}
          createComment={createComment}
          loading={itemsLoading && !selectedItem}
        />
      </div>
    </div>
  );
}
