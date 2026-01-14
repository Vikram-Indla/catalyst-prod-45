// ============================================================
// KANBAN BOARD COMPONENT
// Main board with drag-and-drop functionality
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { KanbanTask, KanbanTaskFilters } from '../../types/kanban';
import { useKanbanStatuses, useKanbanStatusesRealtime } from '../../hooks/useKanbanStatuses';
import { useKanbanTasks, useKanbanTasksRealtime, useMoveKanbanTask } from '../../hooks/useKanbanTasks';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanFilters } from './KanbanFilters';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface KanbanBoardProps {
  onTaskClick?: (task: any) => void;
  onTaskEdit?: (task: any) => void;
  onTaskDelete?: (taskId: string) => void;
  onAddTask?: (statusId?: string) => void;
}

export function KanbanBoard({
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
}: KanbanBoardProps) {
  // Filters state
  const [filters, setFilters] = useState<KanbanTaskFilters>({
    search: '',
    priority: 'all',
    assignee_id: 'all',
    workstream_id: 'all',
  });

  // Data hooks
  const { data: statuses = [], isLoading: statusesLoading } = useKanbanStatuses();
  const { data: tasks = [], isLoading: tasksLoading } = useKanbanTasks(filters);
  const moveTask = useMoveKanbanTask();

  // Realtime subscriptions
  useKanbanStatusesRealtime();
  useKanbanTasksRealtime();

  // Drag state
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {};
    statuses.forEach((status) => {
      grouped[status.id] = tasks
        .filter((t) => t.status_id === status.id)
        .sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [tasks, statuses]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  }, [tasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over for visual feedback
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Find the task being dragged
    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    // Determine target status (either over a column or over another task)
    let targetStatusId: string;
    let targetPosition: number;

    // Check if dropping on a column
    const targetStatus = statuses.find((s) => s.id === overId);
    if (targetStatus) {
      targetStatusId = targetStatus.id;
      const tasksInColumn = tasksByStatus[targetStatusId] || [];
      targetPosition = tasksInColumn.length;
    } else {
      // Dropping on another task
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      
      targetStatusId = overTask.status_id;
      targetPosition = overTask.position;
    }

    // Only move if something changed
    if (draggedTask.status_id === targetStatusId && draggedTask.position === targetPosition) {
      return;
    }

    // Execute move
    moveTask.mutate({
      taskId,
      newStatusId: targetStatusId,
      newPosition: targetPosition,
    });
  }, [tasks, statuses, tasksByStatus, moveTask]);

  const handleFilterChange = useCallback((newFilters: Partial<KanbanTaskFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const isLoading = statusesLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* Board */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-4 min-h-full">
            {statuses.map((status) => (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={tasksByStatus[status.id] || []}
                onTaskClick={onTaskClick}
                onTaskEdit={onTaskEdit}
                onTaskDelete={onTaskDelete}
                onAddTask={onAddTask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <KanbanCard task={activeTask} isDragging />
            )}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
