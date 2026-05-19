import React from 'react';
import Button from '@atlaskit/button/new';
import CrossCircleIcon from '@atlaskit/icon/glyph/cross-circle';

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
        iconBefore={<CrossCircleIcon label="Clear selection" size="small" />}
        onClick={onClearSelection}
        aria-label="Clear selection"
      />
    </div>
  );
}
