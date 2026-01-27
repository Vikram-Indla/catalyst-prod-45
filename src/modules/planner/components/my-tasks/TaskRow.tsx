// ============================================================
// TASK ROW
// Planner V9: Enterprise task row with progress bars and badges
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
import { Progress } from '@/components/ui/progress';
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
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });

    if (date < today) {
      const daysOverdue = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return { text: `${daysOverdue}d overdue`, className: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
    } else if (date.toDateString() === today.toDateString()) {
      return { text: 'Today', className: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', className: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    } else {
      return { 
        text: dayOfWeek, 
        className: 'text-slate-500 dark:text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-700/50'
      };
    }
  };

  const dueDate = formatDueDate();
  const subtaskProgress = task.subtask_total > 0 
    ? Math.round((task.subtask_completed / task.subtask_total) * 100) 
    : 0;

  // Format time estimate
  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h`;
  };

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3',
        'hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors',
        isSelected && 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500',
        task.status_is_done && 'opacity-50'
      )}
      onClick={handleRowClick}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Multi-select Checkbox */}
      {isMultiSelectMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleSelectToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
      )}

      {/* Complete Circle */}
      <button
        onClick={handleComplete}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
          'transition-all hover:scale-110',
          task.status_is_done 
            ? 'bg-green-500 border-green-500 text-white' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-700'
        )}
        style={{ borderColor: task.status_is_done ? undefined : priority.color }}
      >
        {task.status_is_done && <CheckCircle2 className="w-3 h-3" />}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        {/* Main Row */}
        <div className="flex items-center gap-2 mb-1">
          {/* Task Key */}
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
            {task.task_key}
          </span>
          
          {/* Title */}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className={cn(
                'flex-1 bg-transparent border-b-2 border-blue-500',
                'outline-none text-slate-900 dark:text-slate-100 font-medium'
              )}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={cn(
                'font-medium text-slate-900 dark:text-slate-100 truncate',
                task.status_is_done && 'line-through text-slate-500'
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
            <Badge 
              variant="outline" 
              className="text-xs px-1.5 py-0 h-5 gap-0.5 border-slate-300 dark:border-slate-600"
            >
              <Link2 className="w-3 h-3" />
              {task.blocking_count}
            </Badge>
          )}
        </div>

        {/* Meta Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Workstream Badge */}
          {task.workstream_name && (
            <Badge
              className="text-xs px-2 py-0.5 h-5 font-medium border-0"
              style={{ 
                backgroundColor: `${task.workstream_color}20`,
                color: task.workstream_color || undefined,
              }}
            >
              {task.workstream_name}
            </Badge>
          )}

          {/* Status Badge */}
          <Badge
            className="text-xs px-2 py-0.5 h-5 font-medium"
            style={{ 
              backgroundColor: `${task.status_color}20`,
              color: task.status_color,
            }}
          >
            ● {task.status_name}
          </Badge>

          {/* Due Date */}
          {dueDate && (
            <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', dueDate.bg, dueDate.className)}>
              <Calendar className="w-3 h-3" />
              {dueDate.text}
            </span>
          )}

          {/* Time Estimate */}
          {task.time_estimate_minutes && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              {formatTime(task.time_estimate_minutes)}
            </span>
          )}

          {/* Subtask Progress */}
          {task.subtask_total > 0 && (
            <div className="flex items-center gap-1.5">
              <Progress 
                value={subtaskProgress} 
                className="w-16 h-1.5"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {task.subtask_completed}/{task.subtask_total}
              </span>
            </div>
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
              className="text-red-600 dark:text-red-400"
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
