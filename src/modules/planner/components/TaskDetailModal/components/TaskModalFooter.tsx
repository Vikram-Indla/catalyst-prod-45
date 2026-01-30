/**
 * Task Modal Footer Component
 * Shows created/updated timestamps and saving indicator
 */

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';

interface TaskModalFooterProps {
  task: {
    created_at: string;
    updated_at: string;
  };
  isSaving?: boolean;
}

export function TaskModalFooter({ task, isSaving }: TaskModalFooterProps) {
  const createdDate = format(new Date(task.created_at), 'MMM d, yyyy');
  const updatedAgo = formatDistanceToNow(new Date(task.updated_at), { addSuffix: true });

  return (
    <div className="task-modal-footer">
      <span className="footer-text">
        Created <strong>{createdDate}</strong> · Updated <strong>{updatedAgo}</strong>
      </span>
      {isSaving && (
        <span className="saving-indicator">
          <span className="loading-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
          Saving...
        </span>
      )}
    </div>
  );
}
