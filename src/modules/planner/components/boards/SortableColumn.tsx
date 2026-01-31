/**
 * Sortable Column Wrapper
 * Wraps BoardColumn with @dnd-kit sortable for horizontal reordering
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Plus } from 'lucide-react';
import { BoardTaskCard } from './BoardTaskCard';
import type { BoardColumn, BoardTask } from '../../types/planner-boards';
import { cn } from '@/lib/utils';
import { ColumnActions } from './ColumnActions';

import '@/styles/boards.css';

interface SortableColumnProps {
  column: BoardColumn;
  tasks: BoardTask[];
  onTaskClick?: (task: BoardTask) => void;
  onAddTask?: (statusId: string) => void;
  isDraggingColumn?: boolean;
}

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

export function SortableColumn({ 
  column, 
  tasks, 
  onTaskClick, 
  onAddTask,
  isDraggingColumn 
}: SortableColumnProps) {
  // Column sortable (for horizontal reordering)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `column-${column.id}`,
    data: { type: 'column', column }
  });

  // Task droppable (for dropping tasks into column)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        'boards-column',
        isDragging && 'boards-column--dragging',
        isDraggingColumn && 'pointer-events-none'
      )}
    >
      {/* Column Header */}
      <div className="boards-column__header group">
        <div className="boards-column__header-left">
          {/* Drag Handle */}
          <button
            className="boards-column__drag-handle"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder column"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          
          {/* Status Dot */}
          <span 
            className={cn('boards-column__dot', `boards-column__dot--${getStatusClass(column.slug)}`)}
            style={column.color ? { backgroundColor: column.color } : undefined}
          />
          
          {/* Title */}
          <h3 className="boards-column__title">{column.name}</h3>
          
          {/* Task Count */}
          <span className="boards-column__count">{column.task_count}</span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Add Task Button */}
          <button 
            className="boards-column__add-btn"
            onClick={() => onAddTask?.(column.id)}
            aria-label={`Add task to ${column.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Column Actions Menu */}
          <ColumnActions column={column} />
        </div>
      </div>

      {/* Column Body (Droppable for tasks) */}
      <div 
        ref={setDroppableRef}
        className={cn(
          'boards-column__body',
          isOver && 'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
        )}
      >
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
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}
