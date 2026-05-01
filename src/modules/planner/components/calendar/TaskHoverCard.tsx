// ============================================================
// TASK HOVER CARD
// Detailed preview on hover with quick actions
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { format, differenceInDays, startOfDay, isBefore } from 'date-fns';
import { Calendar, User, Layers, Flag, Clock, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { PlannerTask } from '../../types';
import '../../styles/planner-calendar.css';

interface TaskHoverCardProps {
  task: PlannerTask;
  anchorEl: HTMLElement;
  onClose: () => void;
}

interface Position {
  top: number;
  left: number;
}

// Priority config
const PRIORITY_LABELS: Record<string, { label: string; color: string; shape: string }> = {
  critical: { label: 'Critical', color: 'var(--ds-text-danger, var(--ds-text-danger, #dc2626))', shape: '◆' },
  high: { label: 'High', color: '#ea580c', shape: '▲' },
  medium: { label: 'Medium', color: '#ca8a04', shape: '●' },
  low: { label: 'Low', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))', shape: '○' },
};

// Status config
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'backlog': { label: 'Backlog', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))' },
  'planned': { label: 'Planned', color: 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))' },
  'in-progress': { label: 'In Progress', color: 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))' },
  'review': { label: 'Review', color: '#8b5cf6' },
  'done': { label: 'Done', color: '#10b981' },
};

export function TaskHoverCard({ task, anchorEl, onClose }: TaskHoverCardProps) {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate position relative to anchor element
  useEffect(() => {
    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const cardWidth = 320;
      const cardHeight = 280;
      const padding = 8;

      let left = rect.right + padding;
      let top = rect.top;

      // Check if card would go off right edge
      if (left + cardWidth > window.innerWidth) {
        left = rect.left - cardWidth - padding;
      }

      // Check if card would go off bottom edge
      if (top + cardHeight > window.innerHeight) {
        top = window.innerHeight - cardHeight - padding;
      }

      // Ensure top is not negative
      if (top < padding) {
        top = padding;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);

    return () => {
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [anchorEl, onClose]);

  // Calculate overdue
  const overdueInfo = (() => {
    if (!task.dueDate || task.status === 'done') return null;
    const dueDate = startOfDay(new Date(task.dueDate));
    const today = startOfDay(new Date());
    if (!isBefore(dueDate, today)) return null;
    
    const daysOverdue = differenceInDays(today, dueDate);
    return `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`;
  })();

  const priorityConfig = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;
  const statusConfig = STATUS_LABELS[task.status] || STATUS_LABELS.backlog;

  const cardContent = (
    <div
      ref={cardRef}
      className="cal-hover-card planner-calendar-content"
      style={{ top: position.top, left: position.left }}
      onMouseLeave={onClose}
    >
      {/* Header */}
      <div className="cal-hover-card-header">
        <span className="cal-hover-card-key">{task.key}</span>
        {overdueInfo && (
          <span className="flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {overdueInfo}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="cal-hover-card-title">{task.title}</h4>

      {/* Description */}
      {task.description && (
        <p className="cal-hover-card-description line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Meta Info */}
      <div className="cal-hover-card-meta">
        {/* Status */}
        <div className="cal-hover-card-row">
          <span className="cal-hover-card-label flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Status
          </span>
          <span className="cal-hover-card-value flex items-center gap-1.5">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ background: statusConfig.color }}
            />
            {statusConfig.label}
          </span>
        </div>

        {/* Priority */}
        <div className="cal-hover-card-row">
          <span className="cal-hover-card-label flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5" />
            Priority
          </span>
          <span 
            className="cal-hover-card-value flex items-center gap-1.5"
            style={{ color: priorityConfig.color }}
          >
            <span>{priorityConfig.shape}</span>
            {priorityConfig.label}
          </span>
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div className="cal-hover-card-row">
            <span className="cal-hover-card-label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Due Date
            </span>
            <span className={`cal-hover-card-value ${overdueInfo ? 'text-red-600' : ''}`}>
              {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          </div>
        )}

        {/* Assignee */}
        <div className="cal-hover-card-row">
          <span className="cal-hover-card-label flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Assignee
          </span>
          <span className="cal-hover-card-value flex items-center gap-1.5">
            {task.assigneeName ? (
              <>
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
                  style={{ background: task.teamColor || '#6366f1' }}
                >
                  {task.assigneeInitials || task.assigneeName.slice(0, 2).toUpperCase()}
                </span>
                {task.assigneeName}
              </>
            ) : (
              <span className="text-slate-400">Unassigned</span>
            )}
          </span>
        </div>

        {/* Workstream */}
        {task.teamName && (
          <div className="cal-hover-card-row">
            <span className="cal-hover-card-label flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Workstream
            </span>
            <span className="cal-hover-card-value flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded-sm"
                style={{ background: task.teamColor || '#6366f1' }}
              />
              {task.teamName}
            </span>
          </div>
        )}
      </div>

      {/* Progress */}
      {task.progress > 0 && (
        <div className="cal-hover-card-progress">
          <div className="cal-hover-card-progress-bar">
            <div 
              className="cal-hover-card-progress-fill"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>Progress</span>
            <span className="font-medium">{task.progress}%</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="cal-hover-card-actions">
        <button className="cal-hover-card-btn">Edit</button>
        <button className="cal-hover-card-btn">Status ▾</button>
        <button className="cal-hover-card-btn">Assign ▾</button>
      </div>
    </div>
  );

  return createPortal(cardContent, document.body);
}
