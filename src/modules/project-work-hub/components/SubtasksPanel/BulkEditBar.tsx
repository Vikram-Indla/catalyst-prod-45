/**
 * BulkEditBar — Sticky action bar shown while bulk edit mode is active.
 * Jira parity: count + status/priority/assignee/delete + cancel.
 */
import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { StatusPopover } from './popovers/StatusPopover';
import { PriorityPopover } from './popovers/PriorityPopover';
import { AssigneePopover } from './popovers/AssigneePopover';

interface BulkEditBarProps {
  selectedCount: number;
  totalCount: number;
  onStatusChange: (status: string, category: 'todo' | 'in_progress' | 'done') => void;
  onPriorityChange: (priority: 'Critical' | 'High' | 'Medium' | 'Low') => void;
  onAssigneeChange: (a: { accountId: string | null; displayName: string | null }) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkEditBar({
  selectedCount,
  totalCount,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDelete,
  onCancel,
}: BulkEditBarProps) {
  const disabled = selectedCount === 0;

  return (
    <div className="sp-bulkbar" role="toolbar" aria-label="Bulk edit actions">
      <div className="sp-bulkbar-count">
        {selectedCount} of {totalCount} selected
      </div>

      <StatusPopover status="" statusCategory="" showActive={false} onChange={onStatusChange}>
        <button type="button" className="sp-bulkbar-btn" disabled={disabled}>
          Change status
        </button>
      </StatusPopover>

      <PriorityPopover priority="" showActive={false} onChange={onPriorityChange}>
        <button type="button" className="sp-bulkbar-btn" disabled={disabled}>
          Change priority
        </button>
      </PriorityPopover>

      <AssigneePopover currentAccountId={null} showActive={false} onChange={onAssigneeChange}>
        <button type="button" className="sp-bulkbar-btn" disabled={disabled}>
          Change assignee
        </button>
      </AssigneePopover>

      <button
        type="button"
        className="sp-bulkbar-btn sp-bulkbar-btn--danger"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 size={13} />
        Delete
      </button>

      <button
        type="button"
        className="sp-bulkbar-cancel"
        onClick={onCancel}
        aria-label="Exit bulk edit"
      >
        <X size={14} />
        Cancel
      </button>
    </div>
  );
}
