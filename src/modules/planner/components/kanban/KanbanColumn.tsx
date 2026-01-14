// ============================================================
// KANBAN COLUMN COMPONENT
// Droppable column containing task cards
// ============================================================

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { PlannerStatus, KanbanTask } from '../../types/kanban';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  return (
    <div
      className={cn(
        'flex flex-col w-[300px] min-w-[300px] bg-muted/30 rounded-lg',
        isOver && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="font-semibold text-sm text-foreground">{status.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {tasks.length}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onAddTask?.(status.id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Cards Container */}
      <ScrollArea className="flex-1 p-2">
        <div
          ref={setNodeRef}
          className="flex flex-col gap-2 min-h-[100px]"
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
          
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
