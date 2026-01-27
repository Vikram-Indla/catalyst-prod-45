/**
 * Task List Table - Planner V9
 * Main table component with sorting, selection, keyboard nav
 */

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskRow } from './TaskRow';
import { useTaskListKeyboard } from '../../hooks/useTaskListKeyboard';
import type { TaskListTask, TaskListSorting } from '../../hooks/useTaskList';
import type { GroupByOption } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';

interface TaskListTableProps {
  tasks: TaskListTask[];
  isLoading: boolean;
  sorting: TaskListSorting;
  onSortChange: (sorting: TaskListSorting) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onTaskClick: (task: TaskListTask) => void;
  onTaskDelete: (id: string) => void;
  visibleColumns: Set<string>;
  groupBy: GroupByOption | 'none';
}

type SortField = 'task_key' | 'title' | 'status_name' | 'priority' | 'workstream_name' | 'assignee_name' | 'due_date' | 'progress';

interface ColumnDef {
  id: string;
  label: string;
  field: SortField;
  width: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'key', label: 'ID', field: 'task_key', width: 'w-20' },
  { id: 'title', label: 'Title', field: 'title', width: 'min-w-[200px]' },
  { id: 'status', label: 'Status', field: 'status_name', width: 'w-28' },
  { id: 'priority', label: 'Priority', field: 'priority', width: 'w-24' },
  { id: 'workstream', label: 'Workstream', field: 'workstream_name', width: 'w-36' },
  { id: 'assignee', label: 'Assignee', field: 'assignee_name', width: 'w-32' },
  { id: 'dueDate', label: 'Due Date', field: 'due_date', width: 'w-28' },
  { id: 'progress', label: 'Progress', field: 'progress', width: 'w-24' },
];

export function TaskListTable({
  tasks,
  isLoading,
  sorting,
  onSortChange,
  selectedIds,
  onSelectionChange,
  onTaskClick,
  onTaskDelete,
  visibleColumns,
  groupBy,
}: TaskListTableProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Keyboard navigation
  useTaskListKeyboard({
    tasks,
    focusedIndex,
    setFocusedIndex,
    selectedIds,
    onSelectionChange,
    onOpenTask: onTaskClick,
    enabled: true,
  });

  const handleSort = (field: SortField) => {
    if (sorting.field === field) {
      onSortChange({
        field,
        direction: sorting.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onSortChange({ field, direction: 'asc' });
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === tasks.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(tasks.map(t => t.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  // Group tasks if needed
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: null, tasks }];
    }

    const groups: Record<string, TaskListTask[]> = {};
    
    tasks.forEach(task => {
      let groupKey: string;
      
      switch (groupBy) {
        case 'status':
          groupKey = task.status_name || 'No Status';
          break;
        case 'priority':
          groupKey = task.priority || 'No Priority';
          break;
        case 'assignee':
          groupKey = task.assignee_name || 'Unassigned';
          break;
        default:
          groupKey = 'Other';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });

    return Object.entries(groups).map(([key, groupTasks]) => ({
      key,
      label: key,
      tasks: groupTasks,
    }));
  }, [tasks, groupBy]);

  const visibleColumnDefs = COLUMNS.filter(col => visibleColumns.has(col.id));

  const SortHeader = ({ column }: { column: ColumnDef }) => (
    <button
      onClick={() => handleSort(column.field)}
      className="flex items-center gap-1 text-left font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase text-[11px] tracking-wide"
    >
      {column.label}
      {sorting.field === column.field ? (
        sorting.direction === 'asc' ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <ArrowUpDown className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
          No tasks found
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Try adjusting your filters or create a new task
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="w-10 px-3 py-3">
              <Checkbox
                checked={selectedIds.size === tasks.length && tasks.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </th>
            {visibleColumnDefs.map(col => (
              <th key={col.id} className={cn(col.width, "px-3 py-3 text-left group")}>
                <SortHeader column={col} />
              </th>
            ))}
            {visibleColumns.has('actions') && (
              <th className="w-14 px-3 py-3"></th>
            )}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {groupedTasks.map((group, groupIndex) => (
              <motion.tr
                key={group.key}
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="contents"
              >
                {group.label && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <td 
                      colSpan={visibleColumnDefs.length + 2} 
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
                    >
                      {group.label} ({group.tasks.length})
                    </td>
                  </tr>
                )}
                {group.tasks.map((task, taskIndex) => {
                  const globalIndex = groupBy === 'none' 
                    ? taskIndex 
                    : groupedTasks.slice(0, groupIndex).reduce((acc, g) => acc + g.tasks.length, 0) + taskIndex;
                  
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      index={globalIndex}
                      isSelected={selectedIds.has(task.id)}
                      isFocused={focusedIndex === globalIndex}
                      onSelect={handleSelectOne}
                      onClick={onTaskClick}
                      onDelete={onTaskDelete}
                      visibleColumns={visibleColumns}
                    />
                  );
                })}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
