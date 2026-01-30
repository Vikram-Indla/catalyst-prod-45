/**
 * Task Modal Header Component
 * Task ID, workstream link, title, and action buttons
 */

import React from 'react';
import { X, Link2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface TaskModalHeaderProps {
  task: {
    task_key: string;
    title: string;
    workstream?: { name: string; key_prefix?: string } | null;
  };
  onClose: () => void;
}

export function TaskModalHeader({ task, onClose }: TaskModalHeaderProps) {
  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?task=${task.task_key}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="task-modal-header">
      <div className="header-top-row">
        <div className="task-meta-info">
          <span className="task-id">{task.task_key}</span>
          <span className="meta-separator">·</span>
          <span className="workstream-link">{task.workstream?.name || 'No Workstream'}</span>
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
      <h1 className="task-title" style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
        {task.title}
      </h1>
    </div>
  );
}
