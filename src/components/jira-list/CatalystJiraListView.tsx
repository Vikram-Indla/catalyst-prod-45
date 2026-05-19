/**
 * CatalystJiraListView — top-level orchestrator for the Jira-like BAU list view.
 * Combines DynamicTable + footer + bulk actions bar + mobile card fallback.
 */
import React, { useState, useCallback } from 'react';
import { CatalystJiraDynamicTable } from './CatalystJiraDynamicTable';
import { TableFooter } from './TableFooter';
import { BulkActionsBar } from './BulkActionsBar';
import { MobileIssueCard } from './MobileIssueCard';
import type { CatalystJiraListViewProps } from './jira-list.types';
import './jira-list.css';

export function CatalystJiraListView({
  issues,
  currentPage,
  isLoading,
  sortKey,
  sortOrder,
  onSort,
  onSetPage,
  onOpen = () => {},
  onStatusChange = () => {},
  availableStatuses = [],
}: CatalystJiraListViewProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const handleSelectAll = useCallback(() => {
    setSelectedKeys(new Set(issues.map((i) => i.key)));
  }, [issues]);

  const handleClearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  return (
    <>
      {/* Desktop — @atlaskit/dynamic-table; hidden below 480px via CSS */}
      <CatalystJiraDynamicTable
        issues={issues}
        currentPage={currentPage}
        isLoading={isLoading}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
        onSetPage={onSetPage}
        onOpen={onOpen}
        onStatusChange={onStatusChange}
        availableStatuses={availableStatuses}
      />

      {/* Mobile — card list; hidden above 480px via CSS */}
      <div className="catalyst-mobile-card-list" role="list" aria-label="Issues">
        {issues.map((issue) => (
          <div key={issue.key} role="listitem">
            <MobileIssueCard issue={issue} onOpen={onOpen} />
          </div>
        ))}
      </div>

      <TableFooter
        totalIssues={issues.length}
        loadedIssues={issues.length}
        isLoading={isLoading}
        onRefresh={() => onSetPage(1)}
      />

      <BulkActionsBar
        selectedCount={selectedKeys.size}
        totalCount={issues.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />
    </>
  );
}
