// ============================================================
// TASK ROW
// Planner V9: Individual task row with inline interactions
// ============================================================

import { useState, useRef } from 'react';
import { 
  GripVertical, 
  CheckCircle2, 
  Calendar,
  Clock,
  Link2,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompleteMyTask, useUpdateMyTask, useDeleteMyTask } from '../../hooks/useMyTasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MyTask } from '../../types/my-tasks';
import { PRIORITY_CONFIG } from '../../types/my-tasks';

interface TaskRowProps {
  task: MyTask;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onSelect: (taskId: string, isMultiSelect: boolean) => void;
  onOpenDetail: (taskId: string) => void;
}

export function TaskRow({ 
  task, 
  isSelected, 
  isMultiSelectMode,
  onSelect, 
  onOpenDetail,
}: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const completeTask = useCompleteMyTask();
  const updateTask = useUpdateMyTask();
  const deleteTask = useDeleteMyTask();

  const priority = PRIORITY_CONFIG[task.priority];

  // Handle checkbox click (complete task)
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.status_is_done) {
      completeTask.mutate(task.id);
    }
  };

  // Handle multi-select checkbox
  const handleSelectToggle = (checked: boolean) => {
    onSelect(task.id, true);
  };

  // Handle row click
  const handleRowClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      onSelect(task.id, true);
    } else if (!isEditing) {
      onOpenDetail(task.id);
    }
  };

  // Handle inline title edit
  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      updateTask.mutate({ id: task.id, title: editTitle.trim() });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  // Format due date
  const formatDueDate = () => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date < today) {
      return { text: 'Overdue', className: 'text-[var(--planner-danger)]' };
    } else if (date.toDateString() === today.toDateString()) {
      return { text: 'Today', className: 'text-[var(--planner-warning)]' };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', className: 'text-[var(--planner-primary)]' };
    } else {
      return { 
        text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        className: 'text-[var(--planner-text-secondary)]' 
      };
    }
  };

  const dueDate = formatDueDate();

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-4 py-3',
        'hover:bg-[var(--planner-bg-hover)] cursor-pointer transition-colors',
        isSelected && 'bg-[var(--planner-primary-muted)] border-l-2 border-l-[var(--planner-primary)]',
        task.status_is_done && 'opacity-60'
      )}
      onClick={handleRowClick}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-[var(--planner-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Multi-select Checkbox */}
      {isMultiSelectMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleSelectToggle}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-[var(--planner-primary)]"
        />
      )}

      {/* Complete Checkbox */}
      <button
        onClick={handleComplete}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
          'transition-all hover:scale-110',
          task.status_is_done 
            ? 'bg-[var(--planner-success)] border-[var(--planner-success)] text-white' 
            : 'hover:bg-[var(--planner-bg-hover)]'
        )}
        style={{ borderColor: task.status_is_done ? undefined : priority.color }}
      >
        {task.status_is_done && <CheckCircle2 className="w-3 h-3" />}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        {/* Main Row */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--planner-text-muted)]">
            {task.task_key}
          </span>
          
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className={cn(
                'flex-1 bg-transparent border-b-2 border-[var(--planner-primary)]',
                'outline-none text-[var(--planner-text-primary)] font-medium'
              )}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={cn(
                'font-medium text-[var(--planner-text-primary)] truncate',
                task.status_is_done && 'line-through'
              )}
              onDoubleClick={handleTitleDoubleClick}
            >
              {task.title}
            </span>
          )}

          {/* Priority Indicator */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: priority.color }}
            title={priority.label}
          />

          {/* Dependencies Badge */}
          {task.blocking_count > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 gap-1">
              <Link2 className="w-3 h-3" />
              {task.blocking_count}
            </Badge>
          )}
        </div>

        {/* Meta Row */}
        <div className="flex items-center gap-2 mt-1">
          {/* Workstream Badge */}
          {task.workstream_name && (
            <Badge
              variant="secondary"
              className="text-xs px-1.5 py-0 h-5"
              style={{ 
                backgroundColor: `${task.workstream_color}20`,
                color: task.workstream_color || undefined,
                borderColor: task.workstream_color || undefined,
              }}
            >
              {task.workstream_name}
            </Badge>
          )}

          {/* Status Badge */}
          <Badge
            variant="outline"
            className="text-xs px-1.5 py-0 h-5"
            style={{ 
              borderColor: task.status_color,
              color: task.status_color,
            }}
          >
            {task.status_name}
          </Badge>

          {/* Due Date */}
          {dueDate && (
            <span className={cn('flex items-center gap-1 text-xs', dueDate.className)}>
              <Calendar className="w-3 h-3" />
              {dueDate.text}
            </span>
          )}

          {/* Time Estimate */}
          {task.time_estimate_minutes && (
            <span className="flex items-center gap-1 text-xs text-[var(--planner-text-muted)]">
              <Clock className="w-3 h-3" />
              {Math.floor(task.time_estimate_minutes / 60)}h {task.time_estimate_minutes % 60}m
            </span>
          )}

          {/* Subtask Progress */}
          {task.subtask_total > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--planner-text-secondary)]">
              <CheckCircle2 className="w-3 h-3" />
              {task.subtask_completed}/{task.subtask_total}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(task.id);
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Title
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Flag className="w-4 h-4 mr-2" />
              Set Priority
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Calendar className="w-4 h-4 mr-2" />
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-[var(--planner-danger)]"
              onClick={() => deleteTask.mutate(task.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
