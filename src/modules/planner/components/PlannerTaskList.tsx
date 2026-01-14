// ============================================================
// PLANNER TASK LIST VIEW
// Sortable table with configurable columns
// ============================================================

import { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  Copy, 
  Lock, 
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
  visibleColumns: Set<string>;
}

type SortField = 'key' | 'title' | 'status' | 'priority' | 'assigneeName' | 'teamName' | 'startDate' | 'dueDate' | 'progress';
type SortDirection = 'asc' | 'desc';

// Column definitions
interface ColumnDef {
  id: string;
  label: string;
  field: SortField;
  width: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: 'key', label: 'ID', field: 'key', width: 'w-24', defaultVisible: true },
  { id: 'title', label: 'Title', field: 'title', width: 'min-w-[200px]', defaultVisible: true },
  { id: 'status', label: 'Status', field: 'status', width: 'w-28', defaultVisible: true },
  { id: 'priority', label: 'Priority', field: 'priority', width: 'w-28', defaultVisible: true },
  { id: 'teamName', label: 'Workstream', field: 'teamName', width: 'w-36', defaultVisible: true },
  { id: 'assigneeName', label: 'Assignee', field: 'assigneeName', width: 'w-36', defaultVisible: true },
  { id: 'startDate', label: 'Start Date', field: 'startDate', width: 'w-28', defaultVisible: true },
  { id: 'dueDate', label: 'Due Date', field: 'dueDate', width: 'w-28', defaultVisible: true },
  { id: 'progress', label: 'Progress', field: 'progress', width: 'w-28', defaultVisible: true },
];

// Load from localStorage or use defaults
const getInitialVisibleColumns = (): Set<string> => {
  try {
    const stored = localStorage.getItem('planner-visible-columns');
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // ignore
  }
  return new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id));
};

export function PlannerTaskList({
  tasks,
  onTaskClick,
  onTaskUpdate,
  selectedTaskIds,
  onSelectionChange,
  visibleColumns,
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
        case 'teamName':
          comparison = (a.teamName || '').localeCompare(b.teamName || '');
          break;
        case 'assigneeName':
          comparison = (a.assigneeName || '').localeCompare(b.assigneeName || '');
          break;
        case 'startDate':
          const startA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
          const startB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
          comparison = startA - startB;
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  );

  const visibleColumnDefs = ALL_COLUMNS.filter(col => visibleColumns.has(col.id));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              {visibleColumnDefs.map(col => (
                <th key={col.id} className={cn(col.width, "px-3 py-3 text-left")}>
                  <SortHeader field={col.field}>{col.label}</SortHeader>
                </th>
              ))}
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
                      "border-b border-border-subtle cursor-pointer transition-colors group",
                      isSelected && "bg-brand-primary-light",
                      task.blocked && "bg-destructive/5",
                      !isSelected && !task.blocked && "hover:bg-surface-2"
                    )}
                  >
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectOne(task.id)}
                      />
                    </td>

                    {/* ID */}
                    {visibleColumns.has('key') && (
                      <td className="px-3 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick(task);
                          }}
                          className="font-mono text-xs font-semibold text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
                        >
                          {task.key.startsWith('PLN-') ? task.key : `PLN-${task.key.replace(/^[A-Z]+-/, '')}`}
                        </button>
                      </td>
                    )}

                    {/* Title */}
                    {visibleColumns.has('title') && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {task.blocked && <Lock className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                          <span className="font-medium text-foreground truncate max-w-[300px]">
                            {task.title}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.has('status') && (
                      <td className="px-3 py-3">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: statusConfig?.color }}
                        >
                          {statusConfig?.title}
                        </span>
                      </td>
                    )}

                    {/* Priority */}
                    {visibleColumns.has('priority') && (
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
                    )}

                    {/* Team */}
                    {visibleColumns.has('teamName') && (
                      <td className="px-3 py-3">
                        {task.teamName ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{task.teamEmoji || '👥'}</span>
                            <span className="text-foreground/70 truncate text-xs font-medium">
                              {task.teamName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    {/* Assignee */}
                    {visibleColumns.has('assigneeName') && (
                      <td className="px-3 py-3">
                        {task.assigneeName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-semibold">
                              {task.assigneeInitials}
                            </div>
                            <span className="text-foreground/80 truncate">{task.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                    )}

                    {/* Start Date */}
                    {visibleColumns.has('startDate') && (
                      <td className="px-3 py-3">
                        {task.startDate ? (
                          <span className="text-xs font-medium text-foreground/70">
                            {formatDate(task.startDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    {/* Due Date */}
                    {visibleColumns.has('dueDate') && (
                      <td className="px-3 py-3">
                        {task.dueDate ? (
                          <span className={cn(
                            "text-xs font-medium",
                            isOverdue ? "text-destructive" : "text-foreground/70"
                          )}>
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    {/* Progress */}
                    {visibleColumns.has('progress') && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
                        </div>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
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
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No tasks found
          </div>
        )}
      </div>
    </div>
  );
}
