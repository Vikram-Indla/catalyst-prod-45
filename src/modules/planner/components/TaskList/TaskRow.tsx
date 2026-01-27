/**
 * Task Row Component - Planner V9
 * Single row in the task list table with inline editing
 */

import { useState } from 'react';
import { Lock, MoreHorizontal, ExternalLink, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { PRIORITY_CONFIG } from '../../types';
import type { TaskListTask } from '../../hooks/useTaskList';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TaskRowProps {
  task: TaskListTask;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: (id: string) => void;
  onClick: (task: TaskListTask) => void;
  onDelete: (id: string) => void;
  visibleColumns: Set<string>;
}

export function TaskRow({
  task,
  index,
  isSelected,
  isFocused,
  onSelect,
  onClick,
  onDelete,
  visibleColumns,
}: TaskRowProps) {
  const workstreamColors = getWorkstreamColor(task.workstream_name);
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(task.task_key);
    toast.success(`Copied ${task.task_key}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), 'MMM d');
  };

  const getDueDateStyle = () => {
    if (!task.due_date) return {};
    if (task.is_overdue) {
      return { 
        className: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
      };
    }
    if (task.is_due_today) {
      return { 
        className: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
      };
    }
    if (task.is_due_soon) {
      return { 
        className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
      };
    }
    return { className: 'text-slate-600 dark:text-slate-400' };
  };

  const dueDateStyle = getDueDateStyle();

  return (
    <tr
      data-task-index={index}
      onClick={() => onClick(task)}
      className={cn(
        "h-12 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors group",
        isSelected && "bg-blue-50 dark:bg-blue-950/30",
        isFocused && !isSelected && "bg-slate-50 dark:bg-slate-800/50",
        task.blocked && "bg-red-50/50 dark:bg-red-950/20",
        !isSelected && !isFocused && !task.blocked && "hover:bg-slate-50 dark:hover:bg-slate-800/30"
      )}
      style={{
        boxShadow: task.workstream_color ? `inset 4px 0 0 ${task.workstream_color}` : undefined,
      }}
    >
      {/* Checkbox */}
      <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(task.id)}
        />
      </td>

      {/* ID */}
      {visibleColumns.has('key') && (
        <td className="w-20 px-3">
          <button
            onClick={handleCopyKey}
            className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            {task.task_key}
          </button>
        </td>
      )}

      {/* Title */}
      {visibleColumns.has('title') && (
        <td className="px-3">
          <div className="flex items-center gap-2">
            {task.blocked && (
              <Lock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
            <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[300px]">
              {task.title}
            </span>
          </div>
        </td>
      )}

      {/* Status */}
      {visibleColumns.has('status') && (
        <td className="w-28 px-3">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold"
            style={{
              borderColor: task.status_color ? `${task.status_color}40` : '#e2e8f0',
              color: task.status_color || '#64748b',
              backgroundColor: 'transparent',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: task.status_color || '#64748b' }}
            />
            {task.status_name || 'Unknown'}
          </span>
        </td>
      )}

      {/* Priority */}
      {visibleColumns.has('priority') && (
        <td className="w-24 px-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: priorityConfig.color }}
            />
            <span style={{ color: priorityConfig.color }}>
              {priorityConfig.label}
            </span>
          </span>
        </td>
      )}

      {/* Workstream */}
      {visibleColumns.has('workstream') && (
        <td className="w-36 px-3">
          {task.workstream_name ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: workstreamColors.hex }}
              />
              <span style={{ color: workstreamColors.hex }}>
                {task.workstream_name}
              </span>
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      )}

      {/* Assignee */}
      {visibleColumns.has('assignee') && (
        <td className="w-32 px-3">
          {task.assignee_name ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-semibold">
                {task.assignee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                {task.assignee_name}
              </span>
            </div>
          ) : (
            <span className="text-slate-400">Unassigned</span>
          )}
        </td>
      )}

      {/* Due Date */}
      {visibleColumns.has('dueDate') && (
        <td className="w-28 px-3">
          {task.due_date ? (
            <span className={cn(
              "inline-flex items-center text-xs font-semibold px-2 py-1 rounded",
              dueDateStyle.className
            )}>
              {formatDate(task.due_date)}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      )}

      {/* Progress */}
      {visibleColumns.has('progress') && (
        <td className="w-24 px-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${task.progress}%`,
                  backgroundColor: task.progress >= 100 ? '#22c55e' : 
                    task.progress >= 50 ? '#22c55e' : '#94a3b8',
                }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500 w-8 text-right">
              {task.progress}%
            </span>
          </div>
        </td>
      )}

      {/* Actions */}
      {visibleColumns.has('actions') && (
        <td className="w-14 px-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover w-40">
              <DropdownMenuItem onClick={() => onClick(task)}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyKey}>
                <Copy className="w-4 h-4 mr-2" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(task.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </tr>
  );
}
