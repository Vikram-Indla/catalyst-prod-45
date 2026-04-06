// ============================================================
// BOARD KANBAN - V11 with Column Drag-Drop Reordering
// DnD-enabled Kanban board with column reordering and custom columns
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
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useBoardData, useMoveBoardTask } from '../../hooks/usePlannerBoards';
import { useReorderColumns } from '../../hooks/useColumnManagement';
import { SortableColumn } from './SortableColumn';
import { BoardTaskCard } from './BoardTaskCard';
import { AddColumnModal } from './AddColumnModal';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Plus } from 'lucide-react';
import type { BoardFilters, BoardTask, BoardColumn } from '../../types/planner-boards';

// Import Linear-inspired ring-fenced design system
import '@/styles/boards.css';

interface BoardKanbanProps {
  filters?: BoardFilters;
  onTaskClick?: (task: BoardTask) => void;
  onAddTask?: (statusId?: string) => void;
}

export function BoardKanban({ filters, onTaskClick, onAddTask }: BoardKanbanProps) {
  const { columns, tasks, tasksByStatus, isLoading, isError, refetch } = useBoardData(filters);
  const moveTask = useMoveBoardTask();
  const reorderColumns = useReorderColumns();
  
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null);
  const [localColumns, setLocalColumns] = useState<BoardColumn[] | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);

  // Use local columns during drag, otherwise use fetched columns
  const displayColumns = localColumns ?? columns;

  // DnD sensors with slight delay to differentiate click from drag
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
    const { active } = event;
    const activeId = String(active.id);

    // Check if dragging a column
    if (activeId.startsWith('column-')) {
      const columnId = activeId.replace('column-', '');
      const column = columns.find((c) => c.id === columnId);
      if (column) {
        setActiveColumn(column);
        setLocalColumns(columns);
      }
    } else {
      // Dragging a task
      const task = tasks.find((t) => t.id === activeId);
      if (task) setActiveTask(task);
    }
  }, [columns, tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setActiveColumn(null);

    if (!over) {
      setLocalColumns(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Handle column reordering
    if (activeId.startsWith('column-') && overId.startsWith('column-')) {
      const activeColumnId = activeId.replace('column-', '');
      const overColumnId = overId.replace('column-', '');

      if (activeColumnId !== overColumnId && localColumns) {
        const oldIndex = localColumns.findIndex((c) => c.id === activeColumnId);
        const newIndex = localColumns.findIndex((c) => c.id === overColumnId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newColumns = arrayMove(localColumns, oldIndex, newIndex);
          setLocalColumns(newColumns);

          // Persist new order
          const updates = newColumns.map((col, idx) => ({
            id: col.id,
            position: idx,
          }));

          reorderColumns.mutate({ columns: updates }, {
            onSuccess: () => {
              setLocalColumns(null);
              refetch();
            },
            onError: () => {
              setLocalColumns(null);
            }
          });
        }
      }
      return;
    }

    // Handle task movement
    const taskId = activeId;
    const draggedTask = tasks.find((t) => t.id === taskId);
    
    if (!draggedTask) {
      setLocalColumns(null);
      return;
    }

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
      if (!overTask) {
        setLocalColumns(null);
        return;
      }
      
      targetStatusId = overTask.status_id;
      targetPosition = overTask.position;
    }

    // Only move if something changed
    if (draggedTask.status_id === targetStatusId && draggedTask.position === targetPosition) {
      setLocalColumns(null);
      return;
    }

    moveTask.mutate({
      task_id: taskId,
      target_status_id: targetStatusId,
      target_position: targetPosition,
    });

    setLocalColumns(null);
  }, [tasks, columns, localColumns, moveTask, reorderColumns, refetch]);

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
    setActiveColumn(null);
    setLocalColumns(null);
  }, []);

  // Column IDs for sortable context
  const columnIds = useMemo(() => 
    displayColumns.map((c) => `column-${c.id}`), 
    [displayColumns]
  );

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
    <>
      <ScrollArea className="h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            <div className="boards-container">
              {displayColumns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  tasks={getColumnTasks(column.slug)}
                  onTaskClick={onTaskClick}
                  onAddTask={onAddTask}
                />
              ))}

              {/* Add Column Button */}
              <button
                className="boards-add-column dark:border-[#2E2E2E] dark:text-[#878787] dark:hover:bg-[#1A1A1A] dark:hover:text-[#EDEDED] dark:hover:border-[#454545]"
                onClick={() => setIsAddColumnOpen(true)}
              >
                <Plus className="w-5 h-5" />
                <span>Add Column</span>
              </button>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTask && (
              <BoardTaskCard task={activeTask} isDragging />
            )}
            {activeColumn && (
              <div className="boards-column boards-column--overlay dark:bg-[#1A1A1A]">
                <div className="boards-column__header">
                  <div className="boards-column__header-left">
                    <span
                      className="boards-column__dot"
                      style={{ backgroundColor: activeColumn.color }}
                    />
                    <h3 className="boards-column__title dark:text-[#EDEDED]">{activeColumn.name}</h3>
                    <span className="boards-column__count dark:bg-[#1A1A1A] dark:text-[#A1A1A1]">{activeColumn.task_count}</span>
                  </div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Add Column Modal */}
      <AddColumnModal 
        open={isAddColumnOpen} 
        onOpenChange={setIsAddColumnOpen} 
      />
    </>
  );
}
