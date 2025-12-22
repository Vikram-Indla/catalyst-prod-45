// src/components/work-manager/WorkManagerBoards.tsx
// Kanban Board View (Drag & Drop) - Enterprise Grade

import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { defaultColumns } from '@/lib/work-manager-data';
import type { TaskExtended, KanbanColumn, TaskStatus } from './types';
import { cn } from '@/lib/utils';

interface WorkManagerBoardsProps {
  tasks: TaskExtended[];
  onOpenTask: (taskId: string) => void;
  onMoveTask: (args: {
    taskId: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    toIndex: number;
  }) => void;
}

export function WorkManagerBoards({ tasks, onOpenTask, onMoveTask }: WorkManagerBoardsProps) {
  const columnTasks = useMemo(() => {
    const grouped: Record<string, TaskExtended[]> = {};
    defaultColumns.forEach(col => {
      grouped[col.status] = tasks
        .filter(t => t.status === col.status)
        .sort((a, b) => a.columnPosition - b.columnPosition);
    });
    return grouped;
  }, [tasks]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const fromStatus = source.droppableId as TaskStatus;
    const toStatus = destination.droppableId as TaskStatus;

    if (fromStatus === toStatus && destination.index === source.index) return;

    onMoveTask({
      taskId: draggableId,
      fromStatus,
      toStatus,
      toIndex: destination.index,
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
        {defaultColumns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            tasks={columnTasks[column.status] || []}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

interface BoardColumnProps {
  column: KanbanColumn;
  tasks: TaskExtended[];
  onOpenTask: (taskId: string) => void;
}

function BoardColumn({ column, tasks, onOpenTask }: BoardColumnProps) {
  const isOverWip = column.wipLimit && tasks.length > column.wipLimit;

  return (
    <div className="flex-shrink-0 w-[300px] min-w-[280px] bg-gray-50 dark:bg-neutral-900 rounded-lg flex flex-col max-h-[calc(100vh-240px)] border border-gray-200 dark:border-gray-800">
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {/* Green dot indicator for Done column */}
          {column.status === 'Done' && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
          <span className={cn(
            "text-[13px] font-semibold",
            column.status === 'Done' ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
          )}>{column.name}</span>
          <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {column.wipLimit && (
            <span 
              className={cn(
                'text-[11px]',
                isOverWip ? 'text-red-600 font-semibold' : 'text-gray-500'
              )}
              title="Work in progress limit"
            >
              WIP: {tasks.length}/{column.wipLimit}
            </span>
          )}
          <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" type="button">
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Column Body - Scrollable + Droppable */}
      <Droppable droppableId={column.status}>
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={cn(
              'flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth',
              dropSnapshot.isDraggingOver && 'bg-[#5c7c5c]/10'
            )}
          >
            {tasks.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400">No tasks</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Drop tasks here</p>
              </div>
            ) : (
              tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={cn(
                        'transition-transform duration-200',
                        dragSnapshot.isDragging && 'rotate-2 scale-105'
                      )}
                    >
                      <TaskCard 
                        task={task} 
                        onClick={() => onOpenTask(task.id)}
                        isDragging={dragSnapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default WorkManagerBoards;
