// ============================================================
// KANBAN COLUMN COMPONENT
// Droppable column containing task cards - Catalyst V5 styling
// ============================================================

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Inbox } from 'lucide-react';
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
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  const taskIds = tasks.map((t) => t.id);
  
  // Get status color with fallback
  const statusColor = status.color || STATUS_COLOR_FALLBACKS[status.slug] || '#2563eb';

  return (
    <div
      className={cn(
        'flex flex-col w-[300px] min-w-[300px] rounded-xl overflow-hidden',
        isOver && 'ring-2 ring-primary/50'
      )}
    >
      {/* Column Header - White background */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-t-xl">
        <div className="flex items-center gap-2.5">
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
            ref={setNodeRef}
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
