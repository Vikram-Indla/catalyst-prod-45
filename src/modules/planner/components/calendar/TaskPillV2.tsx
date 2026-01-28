// ============================================================
// ENHANCED TASK PILL V2
// Status stripe, priority shapes, progress bar, hover preview
// ============================================================

import { useState, useRef, useCallback, useMemo } from 'react';
import { isBefore, startOfDay, differenceInDays, formatDistanceToNow } from 'date-fns';
import { GripVertical } from 'lucide-react';
import type { PlannerTask } from '../../types';
import { TaskHoverCard } from './TaskHoverCard';
import '../../styles/planner-calendar.css';

interface TaskPillV2Props {
  task: PlannerTask;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, task: PlannerTask) => void;
  compact?: boolean;
}

// Priority shape map: ◆ Critical, ▲ High, ● Medium, ○ Low
const PRIORITY_SHAPES: Record<string, string> = {
  critical: '◆',
  high: '▲',
  medium: '●',
  low: '○',
};

// Map status to slug for data attribute
function getStatusSlug(status: string): string {
  const map: Record<string, string> = {
    'backlog': 'backlog',
    'planned': 'planned',
    'in-progress': 'progress',
    'review': 'review',
    'done': 'done',
  };
  return map[status] || 'backlog';
}

export function TaskPillV2({ task, onClick, onContextMenu, compact = false }: TaskPillV2Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout>();
  const pillRef = useRef<HTMLDivElement>(null);

  // Calculate overdue status
  const overdueInfo = useMemo(() => {
    if (!task.dueDate || task.status === 'done') return null;
    const dueDate = startOfDay(new Date(task.dueDate));
    const today = startOfDay(new Date());
    if (!isBefore(dueDate, today)) return null;
    
    const daysOverdue = differenceInDays(today, dueDate);
    return {
      days: daysOverdue,
      label: daysOverdue === 1 ? '1d' : `${daysOverdue}d`,
    };
  }, [task.dueDate, task.status]);

  // Assignee color based on workstream or fallback
  const assigneeColor = task.teamColor || '#6366f1';
  const assigneeInitials = task.assigneeInitials || task.assigneeName?.slice(0, 2).toUpperCase();

  // Handle hover with delay for hover card
  const handleMouseEnter = useCallback(() => {
    hoverTimeout.current = setTimeout(() => {
      setIsHovered(true);
    }, 300); // 300ms delay per spec
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setIsHovered(false);
  }, []);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, task);
  };

  return (
    <>
      <div
        ref={pillRef}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`cal-task-pill ${isDragging ? 'is-dragging' : ''}`}
        data-status={getStatusSlug(task.status)}
        data-priority={task.priority}
        style={{
          '--task-progress': `${task.progress || 0}%`,
          borderLeftColor: task.teamColor || '#6366f1',
          borderLeftWidth: '4px',
        } as React.CSSProperties}
        title={`${task.title}${task.assigneeName ? ` - ${task.assigneeName}` : ''}`}
      >
        {/* Drag Handle */}
        <GripVertical className="cal-drag-handle w-3 h-3" />

        {/* Priority Shape */}
        <span 
          className="cal-priority-icon"
          data-priority={task.priority}
        >
          {PRIORITY_SHAPES[task.priority] || '●'}
        </span>

        {/* Task Title */}
        <span className="cal-task-title">
          {task.title}
        </span>

        {/* Overdue Badge */}
        {overdueInfo && (
          <span className="cal-overdue-badge">
            {overdueInfo.label}
          </span>
        )}

        {/* Assignee Avatar */}
        {assigneeInitials && (
          <div 
            className="cal-task-assignee"
            style={{ background: assigneeColor }}
            title={task.assigneeName || 'Assigned'}
          >
            {assigneeInitials}
          </div>
        )}
      </div>

      {/* Hover Card */}
      {isHovered && pillRef.current && (
        <TaskHoverCard
          task={task}
          anchorEl={pillRef.current}
          onClose={() => setIsHovered(false)}
        />
      )}
    </>
  );
}
