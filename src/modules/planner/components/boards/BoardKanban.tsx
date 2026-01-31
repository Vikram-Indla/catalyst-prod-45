// ============================================================
// BOARD KANBAN - V10 Enterprise Clean
// DnD-enabled Kanban board with V10 enterprise design
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
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useBoardData, useMoveBoardTask } from '../../hooks/usePlannerBoards';
import { BoardColumn } from './BoardColumn';
import { BoardTaskCard } from './BoardTaskCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { BoardFilters, BoardTask } from '../../types/planner-boards';

// Import Linear-inspired ring-fenced design system
import '@/styles/boards.css';

interface BoardKanbanProps {
  filters?: BoardFilters;
  onTaskClick?: (task: BoardTask) => void;
  onAddTask?: (statusId?: string) => void;
}

export function BoardKanban({ filters, onTaskClick, onAddTask }: BoardKanbanProps) {
  const { columns, tasks, tasksByStatus, isLoading, isError } = useBoardData(filters);
  const moveTask = useMoveBoardTask();
  
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get tasks for a column
  const getColumnTasks = useCallback((statusSlug: string) => {
    return (tasksByStatus[statusSlug] || []).sort((a, b) => a.position - b.position);
  }, [tasksByStatus]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const draggedTask = tasks.find((t) => t.id === taskId);
    
    if (!draggedTask) return;

    // Determine target
    let targetStatusId: string;
    let targetPosition: number;

    // Check if dropping on a column
    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn) {
      targetStatusId = targetColumn.id;
      const tasksInColumn = tasks.filter((t) => t.status_id === targetStatusId);
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

    moveTask.mutate({
      task_id: taskId,
      target_status_id: targetStatusId,
      target_position: targetPosition,
    });
  }, [tasks, columns, moveTask]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Failed to load board data
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="boards-container">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={getColumnTasks(column.slug)}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <BoardTaskCard task={activeTask} isDragging />
          )}
        </DragOverlay>
      </DndContext>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
