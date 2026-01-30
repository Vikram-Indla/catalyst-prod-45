/**
 * Task Modal Header Component
 * Task ID, workstream link, title, and action buttons
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Link2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface TaskModalHeaderProps {
  task: {
    task_key: string;
    title: string;
    workstream?: { name: string; key_prefix?: string } | null;
  };
  onClose: () => void;
  onTitleChange: (value: string) => void;
}

export function TaskModalHeader({ task, onClose, onTitleChange }: TaskModalHeaderProps) {
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?task=${task.task_key}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleTitleBlur = () => {
    if (title.trim() !== task.title) {
      onTitleChange(title.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
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
      <input
        ref={inputRef}
        type="text"
        className="task-title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Task title..."
      />
    </div>
  );
}
