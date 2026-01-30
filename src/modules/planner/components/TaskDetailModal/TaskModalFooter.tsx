// ============================================================
// TASK MODAL FOOTER
// Created/Updated timestamps
// ============================================================

import React from 'react';
import { format, parseISO } from 'date-fns';

interface TaskModalFooterProps {
  createdAt: string;
  updatedAt: string;
}

export const TaskModalFooter: React.FC<TaskModalFooterProps> = ({
  createdAt,
  updatedAt,
}) => {
  const formatTimestamp = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy \'at\' h:mm a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="task-modal-footer">
      <span className="footer-text">
        Created <strong>{formatTimestamp(createdAt)}</strong> ·
        Updated <strong>{formatTimestamp(updatedAt)}</strong>
      </span>
    </div>
  );
};
