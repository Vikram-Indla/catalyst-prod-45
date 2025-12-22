// src/components/work-manager/WorkManagerBoards.tsx
// Kanban Board View

import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { defaultColumns } from '@/lib/work-manager-data';
import type { TaskExtended, KanbanColumn } from './types';

interface WorkManagerBoardsProps {
  tasks: TaskExtended[];
  onOpenTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskExtended>) => void;
}

export function WorkManagerBoards({ tasks, onOpenTask, onUpdateTask }: WorkManagerBoardsProps) {
  // Group tasks by status/column
  const columnTasks = useMemo(() => {
    const grouped: Record<string, TaskExtended[]> = {};
    defaultColumns.forEach(col => {
      grouped[col.status] = tasks
        .filter(t => t.status === col.status)
        .sort((a, b) => a.columnPosition - b.columnPosition);
    });
    return grouped;
  }, [tasks]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {defaultColumns.map((column) => (
        <BoardColumn
          key={column.id}
          column={column}
          tasks={columnTasks[column.status] || []}
          onOpenTask={onOpenTask}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </div>
  );
}

interface BoardColumnProps {
  column: KanbanColumn;
  tasks: TaskExtended[];
  onOpenTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskExtended>) => void;
}

function BoardColumn({ column, tasks, onOpenTask, onUpdateTask }: BoardColumnProps) {
  const isOverWip = column.wipLimit && tasks.length > column.wipLimit;
  
  return (
    <div className="flex-shrink-0 w-[300px] bg-surface-muted rounded-lg flex flex-col max-h-[calc(100vh-280px)]">
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-primary">{column.name}</span>
          <span className="px-2 py-0.5 bg-surface-hover text-text-muted text-[11px] font-medium rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {column.wipLimit && (
            <span className={`text-[11px] ${isOverWip ? 'text-status-danger font-semibold' : 'text-text-muted'}`}>
              WIP: {tasks.length}/{column.wipLimit}
            </span>
          )}
          <button className="p-1 rounded hover:bg-surface-hover">
            <MoreHorizontal className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Column Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-[12px] text-text-muted">
            No tasks in this column
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onOpenTask(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default WorkManagerBoards;