// ============================================================
// TASK MODAL HEADER
// Header with task ID, workstream link, and action buttons
// ============================================================

import React from 'react';
import { X, Link2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface TaskModalHeaderProps {
  taskKey: string;
  title: string;
  workstream: string;
  onClose: () => void;
}

export const TaskModalHeader: React.FC<TaskModalHeaderProps> = ({
  taskKey,
  title,
  workstream,
  onClose,
}) => {
  const handleCopyLink = () => {
    const url = `${window.location.origin}/planner/task/${taskKey}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="task-modal-header">
      <div className="header-top-row">
        <div className="task-meta-info">
          <span className="task-id">{taskKey}</span>
          <span className="meta-separator">·</span>
          <a href="#" className="workstream-link">{workstream || 'No Workstream'}</a>
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
