// ============================================================
// BOARD COLUMN — LINEAR-INSPIRED DESIGN
// Droppable column with status dot, count badge, and add button
// ============================================================

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { BoardTaskCard } from './BoardTaskCard';
import type { BoardColumn as BoardColumnType, BoardTask } from '../../types/planner-boards';
import { cn } from '@/lib/utils';

// Import ring-fenced CSS
import '@/styles/boards.css';

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

  // Map status slug to CSS class
  const getStatusClass = (slug: string): string => {
    const statusMap: Record<string, string> = {
      'backlog': 'backlog',
      'planned': 'planned',
      'progress': 'progress',
      'in-progress': 'in-progress',
      'review': 'review',
      'done': 'done',
    };
    return statusMap[slug] || 'backlog';
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'boards-column',
        isOver && 'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
      )}
    >
      {/* Column Header */}
      <div className="boards-column__header">
        <div className="boards-column__header-left">
          <span className={cn('boards-column__dot', `boards-column__dot--${getStatusClass(column.slug)}`)} />
          <h3 className="boards-column__title">{column.name}</h3>
          <span className="boards-column__count">{column.task_count}</span>
        </div>
        
        <button 
          className="boards-column__add-btn"
          onClick={() => onAddTask?.(column.id)}
          aria-label={`Add task to ${column.name}`}
        >
          <Plus />
        </button>
      </div>

      {/* Column Body */}
      <div className="boards-column__body">
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
          <div className="boards-column__empty">
            No tasks
          </div>
        )}

        {/* Add Task Button at bottom */}
        <button className="boards-add-task" onClick={() => onAddTask?.(column.id)}>
          <Plus />
          Add Task
        </button>
      </div>
    </div>
  );
}
