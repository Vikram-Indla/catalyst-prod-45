// src/components/work-manager/WorkManagerBoards.tsx
// Kanban Board View (Drag & Drop)

import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { defaultColumns } from '@/lib/work-manager-data';
import type { TaskExtended, KanbanColumn, TaskStatus } from './types';

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
      <div className="flex gap-4 overflow-x-auto pb-4">
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
    <div className="flex-shrink-0 w-[300px] bg-surface-muted rounded-lg flex flex-col max-h-[calc(100vh-280px)]">
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-primary">{column.name}</span>
          <span className="px-2 py-0.5 bg-surface-hover text-text-muted text-[11px] font-medium rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {column.wipLimit && (
            <span className={`text-[11px] ${isOverWip ? 'text-status-danger font-semibold' : 'text-text-muted'}`}>
              WIP: {tasks.length}/{column.wipLimit}
            </span>
          )}
          <button className="p-1 rounded hover:bg-surface-hover" type="button">
            <MoreHorizontal className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Column Body - Scrollable + Droppable */}
      <Droppable droppableId={column.status}>
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={
              `flex-1 overflow-y-auto p-3 space-y-2 ` +
              (dropSnapshot.isDraggingOver ? 'bg-surface-hover/60' : '')
            }
          >
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-text-muted">No tasks in this column</div>
            ) : (
              tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                    >
                      <TaskCard task={task} onClick={() => onOpenTask(task.id)} />
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
