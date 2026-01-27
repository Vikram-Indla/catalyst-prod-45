// ============================================================
// BOARD COLUMN - V9
// Droppable column with task count and add button
// ============================================================

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { BoardTaskCard } from './BoardTaskCard';
import type { BoardColumn as BoardColumnType, BoardTask } from '../../types/planner-boards';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BoardColumnProps {
  column: BoardColumnType;
  tasks: BoardTask[];
  onTaskClick?: (task: BoardTask) => void;
  onAddTask?: (statusId: string) => void;
}

export function BoardColumn({ column, tasks, onTaskClick, onAddTask }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-72 min-w-72 h-full rounded-xl',
        'bg-slate-100 dark:bg-slate-800/50',
        'border border-slate-200 dark:border-slate-700',
        isOver && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div 
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            {column.name}
          </span>
          <span className="px-1.5 py-0.5 text-xs font-mono font-medium rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {column.task_count}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6"
          onClick={() => onAddTask?.(column.id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <BoardTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-slate-400">
            No tasks
          </div>
        )}
      </div>

      {/* Add Task Footer */}
      <button
        onClick={() => onAddTask?.(column.id)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm',
          'text-slate-500 dark:text-slate-400',
          'hover:text-slate-700 dark:hover:text-slate-200',
          'hover:bg-slate-200/50 dark:hover:bg-slate-700/50',
          'transition-colors rounded-b-xl'
        )}
      >
        <Plus className="w-4 h-4" />
        Add Task
      </button>
    </div>
  );
}
