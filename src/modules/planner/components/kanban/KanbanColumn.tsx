// ============================================================
// KANBAN COLUMN COMPONENT
// Droppable + Sortable column containing task cards - Catalyst V5 styling
// Supports column drag-and-drop reordering
// ============================================================

import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Inbox, GripVertical } from 'lucide-react';
import type { PlannerStatus, KanbanTask } from '../../types/kanban';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Fallback colors in case DB color is missing
const STATUS_COLOR_FALLBACKS: Record<string, string> = {
  'backlog': '#9ca3af',
  'planned': '#2563eb',
  'in-progress': '#d97706',
  'review': '#8b5cf6',
  'done': '#10b981',
};

interface KanbanColumnProps {
  status: PlannerStatus;
  tasks: KanbanTask[];
  onTaskClick?: (task: any) => void;
  onTaskEdit?: (task: any) => void;
  onTaskDelete?: (taskId: string) => void;
  onAddTask?: (statusId?: string) => void;
  isDraggingColumn?: boolean;
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
  isDraggingColumn = false,
}: KanbanColumnProps) {
  // Droppable for task drops
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: status.id,
  });

  // Sortable for column reordering - use prefixed ID to distinguish from tasks
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${status.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskIds = tasks.map((t) => t.id);
  
  // Get status color with fallback
  const statusColor = status.color || STATUS_COLOR_FALLBACKS[status.slug] || '#2563eb';

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        'flex flex-col w-[300px] min-w-[300px] rounded-xl overflow-hidden',
        isOver && 'ring-2 ring-primary/50',
        isDragging && 'opacity-50 scale-[1.02]',
        isDraggingColumn && 'ring-2 ring-primary'
      )}
      {...attributes}
    >
      {/* Column Header - White background with drag handle */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-t-xl group">
        <div className="flex items-center gap-2.5">
          {/* Drag Handle */}
          <button
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity p-0.5 -ml-1 text-muted-foreground hover:text-foreground"
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: statusColor }}
          />
          <h3 className="font-semibold text-sm text-foreground">{status.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => onAddTask?.(status.id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Column Body - Light gray background */}
      <div 
        className={cn(
          "flex-1 bg-muted/40 border-x border-b border-border rounded-b-xl p-2",
          isOver && 'bg-primary/5'
        )}
      >
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div
            ref={setDroppableRef}
            className="flex flex-col gap-2 min-h-[120px]"
          >
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  onEdit={() => onTaskEdit?.(task)}
                  onDelete={() => onTaskDelete?.(task.id)}
                />
              ))}
            </SortableContext>
            
            {/* Empty State */}
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium">No tasks</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Add Task Button - Always visible at bottom */}
        <button
          onClick={() => onAddTask?.(status.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-2 border border-dashed border-border rounded-lg text-muted-foreground text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add task
        </button>
      </div>
    </div>
  );
}
