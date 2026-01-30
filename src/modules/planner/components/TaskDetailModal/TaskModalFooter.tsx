/**
 * TASK MODAL FOOTER
 * Shows created and updated timestamps
 */

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';

interface TaskModalFooterProps {
  createdAt: string | null;
  updatedAt: string | null;
}

export const TaskModalFooter: React.FC<TaskModalFooterProps> = ({
  createdAt,
  updatedAt,
}) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return 'Unknown';
    }
  };

  const formatRelative = (dateStr: string | null) => {
    if (!dateStr) return 'Just now';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="task-modal-footer">
      <span className="footer-text">
        Created <strong>{formatDate(createdAt)}</strong> · Updated{' '}
        <strong>{formatRelative(updatedAt)}</strong>
      </span>
    </div>
  );
};
