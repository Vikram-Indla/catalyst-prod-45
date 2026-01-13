// ============================================================
// PLANNER TASK LIST VIEW
// Sortable table with all task columns
// ============================================================

import { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  Copy, 
  Lock, 
  MoreHorizontal,
  Check,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PlannerTask, TaskStatus, TaskPriority } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface PlannerTaskListProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
  onTaskUpdate: (taskId: string, updates: Partial<PlannerTask>) => void;
  selectedTaskIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

type SortField = 'key' | 'title' | 'status' | 'priority' | 'assigneeName' | 'dueDate' | 'progress';
type SortDirection = 'asc' | 'desc';

export function PlannerTaskList({
  tasks,
  onTaskClick,
  onTaskUpdate,
  selectedTaskIds,
  onSelectionChange,
}: PlannerTaskListProps) {
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Priority order for sorting
  const priorityOrder: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  // Sorted tasks
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'key':
          comparison = a.key.localeCompare(b.key);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'assigneeName':
          comparison = (a.assigneeName || '').localeCompare(b.assigneeName || '');
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [tasks, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.size === tasks.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(tasks.map(t => t.id)));
    }
  };

  const handleSelectOne = (taskId: string) => {
    const newSelection = new Set(selectedTaskIds);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    onSelectionChange(newSelection);
  };

  const handleCopyId = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success(`Copied ${key}`);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left font-medium text-text-muted hover:text-text-primary transition-colors"
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  );

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface-1 z-10">
          <tr className="border-b border-border">
            <th className="w-10 px-3 py-3">
              <Checkbox
                checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </th>
            <th className="w-24 px-3 py-3 text-left">
              <SortHeader field="key">ID</SortHeader>
            </th>
            <th className="px-3 py-3 text-left min-w-[200px]">
              <SortHeader field="title">Title</SortHeader>
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <SortHeader field="status">Status</SortHeader>
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <SortHeader field="priority">Priority</SortHeader>
            </th>
            <th className="w-36 px-3 py-3 text-left">
              <SortHeader field="assigneeName">Assignee</SortHeader>
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <SortHeader field="dueDate">Due Date</SortHeader>
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <SortHeader field="progress">Progress</SortHeader>
            </th>
            <th className="w-10 px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {sortedTasks.map((task, index) => {
              const statusConfig = COLUMN_CONFIG.find(c => c.id === task.status);
              const priorityConfig = PRIORITY_CONFIG[task.priority];
              const isSelected = selectedTaskIds.has(task.id);
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

              return (
                <motion.tr
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => onTaskClick(task)}
                  className={cn(
                    "border-b border-border cursor-pointer transition-colors group",
                    isSelected && "bg-blue-50",
                    task.blocked && "bg-red-50/50",
                    !isSelected && !task.blocked && "hover:bg-surface-1"
                  )}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectOne(task.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyId(task.key);
                      }}
                      className="flex items-center gap-1 font-mono text-xs text-text-muted hover:text-text-primary group/id"
                    >
                      {task.key}
                      <Copy className="w-3 h-3 opacity-0 group-hover/id:opacity-100 transition-opacity" />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {task.blocked && <Lock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                      <span className="font-medium text-text-primary truncate max-w-[300px]">
                        {task.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: statusConfig?.color }}
                    >
                      {statusConfig?.title}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${priorityConfig.color}15`,
                        color: priorityConfig.color 
                      }}
                    >
                      {priorityConfig.emoji} {priorityConfig.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {task.assigneeName ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-medium"
                        >
                          {task.assigneeInitials}
                        </div>
                        <span className="text-text-secondary truncate">{task.assigneeName}</span>
                      </div>
                    ) : (
                      <span className="text-text-muted">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {task.dueDate ? (
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded",
                        isOverdue 
                          ? "bg-red-100 text-red-700" 
                          : "bg-surface-2 text-text-secondary"
                      )}>
                        {new Date(task.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-8">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4 text-text-muted" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface-0">
                        <DropdownMenuItem onClick={() => handleCopyId(task.key)}>
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTaskClick(task)}>
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>

      {tasks.length === 0 && (
        <div className="flex items-center justify-center h-48 text-text-muted">
          No tasks found
        </div>
      )}
    </div>
  );
}
