// ============================================================
// PLANNER TASK LIST VIEW
// Sortable table with configurable columns
// Catalyst V5 semantic colors with priority-based styling
// ============================================================

import { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  Lock, 
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  List
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
import { COLUMN_CONFIG, PRIORITY_CONFIG, STATUS_STYLE_CONFIG } from '../types';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PlannerViewHeader } from './shared/PlannerViewHeader';

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
  { id: 'progress', label: 'Progress', field: 'progress', width: 'w-32', defaultVisible: true },
];

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

  const getDueDateStatus = (dueDate?: string): 'overdue' | 'urgent' | 'safe' => {
    if (!dueDate) return 'safe';
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 2) return 'urgent';
    return 'safe';
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
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* V9 Header */}
      <PlannerViewHeader
        icon={List}
        title="Task List"
        subtitle={`${tasks.length} tasks with sortable columns`}
      />

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
                const statusStyle = STATUS_STYLE_CONFIG[task.status] || { colorful: false, bgColor: 'transparent' };
                const priorityConfig = PRIORITY_CONFIG[task.priority];
                const isSelected = selectedTaskIds.has(task.id);
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                const dueDateStatus = getDueDateStatus(task.dueDate);
                const workstreamColors = getWorkstreamColor(task.teamName);
                // Progress bar uses workstream color

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
                      isSelected && "bg-blue-50 dark:bg-blue-950/30",
                      task.blocked && "bg-red-50/50 dark:bg-red-950/20",
                      !isSelected && !task.blocked && "hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                    )}
                    style={{
                      boxShadow: `inset 5px 0 0 ${workstreamColors.hex}`,
                    }}
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

                    {/* Status - Conditional styling: colorful for active, subtle for default */}
                    {visibleColumns.has('status') && (
                      <td className="px-3 py-3">
                        <span 
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold",
                            !statusStyle.colorful && "bg-transparent"
                          )}
                          style={{ 
                            backgroundColor: statusStyle.colorful ? statusStyle.bgColor : 'transparent',
                            color: statusConfig?.color,
                            border: statusStyle.colorful ? `1px solid ${statusConfig?.color}30` : 'none',
                          }}
                        >
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: statusConfig?.color }}
                          />
                          {statusConfig?.title}
                        </span>
                      </td>
                    )}

                    {/* Priority - Conditional styling: colorful for urgent, subtle for normal */}
                    {visibleColumns.has('priority') && (
                      <td className="px-3 py-3">
                        <span 
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold",
                            !priorityConfig.colorful && "bg-transparent"
                          )}
                          style={{ 
                            backgroundColor: priorityConfig.colorful ? priorityConfig.bgColor : 'transparent',
                            color: priorityConfig.color,
                            border: priorityConfig.colorful ? `1px solid ${priorityConfig.color}30` : 'none',
                          }}
                        >
                          <span className="text-[10px]">{priorityConfig.emoji}</span>
                          {priorityConfig.label}
                        </span>
                      </td>
                    )}

                    {/* Team/Workstream - Always colorful with workstream colors */}
                    {visibleColumns.has('teamName') && (
                      <td className="px-3 py-3">
                        {task.teamName ? (
                          <span 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: workstreamColors.hexLight,
                              color: workstreamColors.hex,
                            }}
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full" 
                              style={{ backgroundColor: workstreamColors.hex }}
                            />
                            {task.teamName}
                          </span>
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

                    {/* Due Date - Colored by urgency */}
                    {visibleColumns.has('dueDate') && (
                      <td className="px-3 py-3">
                        {task.dueDate ? (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded",
                            dueDateStatus === 'overdue' && "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
                            dueDateStatus === 'urgent' && "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
                            dueDateStatus === 'safe' && "text-foreground/70"
                          )}>
                            {formatDate(task.dueDate)}
                            {dueDateStatus === 'overdue' && ' ⚠'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    {/* Progress - Visual bar with colored fill */}
                    {visibleColumns.has('progress') && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5 min-w-[120px]">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${task.progress}%`,
                                backgroundColor: workstreamColors.hex
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground min-w-[36px] text-right">
                            {task.progress}%
                          </span>
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
