import React from 'react';
import Button from '@atlaskit/button/new';

function CrossCircleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete?: () => void;
}

/** Sticky bottom bar shown when ≥1 row is selected. Matches Jira's "N selected" pattern. */
export function BulkActionsBar({ selectedCount, totalCount, onSelectAll, onClearSelection, onDelete }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="catalyst-bulk-bar" role="toolbar" aria-label="Bulk actions">
      <span className="catalyst-bulk-bar__count">{selectedCount} selected</span>
      <Button appearance="subtle" onClick={onSelectAll} aria-label={`Select all ${totalCount} issues`}>
        Select all ({totalCount})
      </Button>
      {onDelete && (
        <Button appearance="danger" onClick={onDelete} aria-label={`Delete ${selectedCount} selected issues`}>
          Delete
        </Button>
      )}
      <Button
        appearance="subtle"
        iconBefore={() => <CrossCircleIcon />}
        onClick={onClearSelection}
        aria-label="Clear selection"
      />
    </div>
  );
}
