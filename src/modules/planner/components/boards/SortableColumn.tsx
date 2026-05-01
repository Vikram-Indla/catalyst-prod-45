/**
 * Sortable Column Wrapper
 * Wraps BoardColumn with @dnd-kit sortable for horizontal reordering
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { BoardTaskCard } from './BoardTaskCard';
import type { BoardColumn, BoardTask } from '../../types/planner-boards';
import { cn } from '@/lib/utils';
import { ColumnActions } from './ColumnActions';
import { useDeleteColumn } from '../../hooks/useColumnManagement';
import { supabase } from '@/integrations/supabase/client';

import '@/styles/boards.css';

interface SortableColumnProps {
  column: BoardColumn;
  tasks: BoardTask[];
  onTaskClick?: (task: BoardTask) => void;
  onAddTask?: (statusId: string) => void;
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
  onAddTask 
}: SortableColumnProps) {
  const deleteColumn = useDeleteColumn();
  
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
    opacity: isDragging ? 0.5 : 1,
  };

  // Check if this is a system column that cannot be deleted
  const isSystemColumn = column.is_system ?? 
    ['backlog', 'planned', 'progress', 'review', 'done'].includes(column.slug);

  const handleDeleteColumn = async () => {
    // Check for tasks in this column
    const { count } = await supabase
      .from('planner_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', column.id)
      .is('deleted_at', null);

    if (count && count > 0) {
      const confirmed = window.confirm(
        `This column has ${count} task(s). Move them to Backlog and delete the column?`
      );
      if (!confirmed) return;
      
      deleteColumn.mutate({ id: column.id, moveTasksToBacklog: true });
    } else {
      const confirmed = window.confirm(`Delete the "${column.name}" column?`);
      if (!confirmed) return;
      deleteColumn.mutate({ id: column.id });
    }
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        'boards-column dark:text-[var(--ds-text,#EDEDED)]',
        isDragging && 'boards-column--dragging'
      )}
    >
      {/* Column Header */}
      <div className="boards-column__header group">
        <div className="boards-column__header-left">
          {/* Drag Handle - Always visible with proper touch handling */}
          <div
            className="boards-column__drag-handle dark:text-[var(--ds-text-subtlest,#878787)] dark:hover:text-[var(--ds-text-subtlest,#A1A1A1)]"
            {...attributes}
            {...listeners}
            style={{ touchAction: 'none' }}
            aria-label="Drag to reorder column"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          
          {/* Status Dot */}
          <span 
            className={cn('boards-column__dot', `boards-column__dot--${getStatusClass(column.slug)}`)}
            style={column.color ? { backgroundColor: column.color } : undefined}
          />
          
          {/* Title */}
          <h3 className="boards-column__title dark:text-[var(--ds-text,#EDEDED)]">{column.name}</h3>

          {/* Task Count */}
          <span className="boards-column__count dark:bg-[var(--ds-surface-raised,#1A1A1A)] dark:text-[var(--ds-text-subtlest,#A1A1A1)]">{column.task_count}</span>
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

          {/* Delete Button - Only for custom columns */}
          {!isSystemColumn && (
            <button 
              className="boards-column__delete-btn"
              onClick={handleDeleteColumn}
              aria-label={`Delete ${column.name} column`}
              title="Delete column"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Column Actions Menu (color picker, etc.) */}
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
          <div className="boards-column__empty dark:bg-[var(--ds-surface-raised,#1A1A1A)] dark:border-[var(--ds-border,#2E2E2E)] dark:text-[var(--ds-text-subtlest,#878787)]">
            No tasks
          </div>
        )}

        {/* Add Task Button at bottom */}
        <button className="boards-add-task dark:border-[var(--ds-border,#2E2E2E)] dark:text-[var(--ds-text-subtlest,#878787)] dark:hover:bg-[var(--ds-surface-raised,#1A1A1A)] dark:hover:text-[var(--ds-text,#EDEDED)] dark:hover:border-[var(--ds-border-bold,#454545)]" onClick={() => onAddTask?.(column.id)}>
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}
