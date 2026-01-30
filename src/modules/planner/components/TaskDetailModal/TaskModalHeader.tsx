/**
 * TASK MODAL HEADER
 * Shows task ID, workstream link, title, and action buttons
 */

import React from 'react';
import { X, Link2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface TaskModalHeaderProps {
  taskKey: string;
  workstream: string | null;
  title: string;
  onClose: () => void;
}

export const TaskModalHeader: React.FC<TaskModalHeaderProps> = ({
  taskKey,
  workstream,
  title,
  onClose,
}) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/task/${taskKey}`);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="task-modal-header">
      <div className="header-top-row">
        <div className="task-meta-info">
          <span className="task-id">{taskKey}</span>
          {workstream && (
            <>
              <span className="meta-separator">·</span>
              <span className="workstream-link">{workstream}</span>
            </>
          )}
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleCopyLink} title="Copy link">
            <Link2 size={18} />
          </button>
          <button className="icon-btn" title="More options">
            <MoreHorizontal size={18} />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>
      <h1 className="task-title">{title}</h1>
    </div>
  );
};
