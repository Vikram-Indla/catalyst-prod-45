// src/components/work-manager/WorkManagerBoards.tsx
// Kanban Board View (Drag & Drop) - Enterprise Grade

import { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal, CheckCircle2, Plus, Settings, EyeOff, Trash2, Eye } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { defaultColumns } from '@/lib/work-manager-data';
import type { TaskExtended, KanbanColumn, TaskStatus } from './types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { EditColumnDialog } from './EditColumnDialog';
import { ClearColumnDialog } from './ClearColumnDialog';
import { Button } from '@/components/ui/button';

interface WorkManagerBoardsProps {
  tasks: TaskExtended[];
  onOpenTask: (taskId: string) => void;
  onMoveTask: (args: {
    taskId: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    toIndex: number;
  }) => void;
  onAddTask?: (status: TaskStatus) => void;
  onClearColumn?: (status: TaskStatus) => void;
}

export function WorkManagerBoards({ tasks, onOpenTask, onMoveTask, onAddTask, onClearColumn }: WorkManagerBoardsProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns.map(c => ({ ...c, wipLimit: undefined })));
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearingColumn, setClearingColumn] = useState<KanbanColumn | null>(null);

  const visibleColumns = useMemo(() => {
    return columns.filter(col => !hiddenColumns.has(col.id));
  }, [columns, hiddenColumns]);

  const columnTasks = useMemo(() => {
    const grouped: Record<string, TaskExtended[]> = {};
    columns.forEach(col => {
      grouped[col.status] = tasks
        .filter(t => t.status === col.status)
        .sort((a, b) => a.columnPosition - b.columnPosition);
    });
    return grouped;
  }, [tasks, columns]);

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

  const handleEditColumn = (column: KanbanColumn) => {
    setEditingColumn(column);
    setEditDialogOpen(true);
  };

  const handleSaveColumn = (columnId: string, newName: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, name: newName } : col
    ));
  };

  const handleHideColumn = (columnId: string) => {
    setHiddenColumns(prev => new Set([...prev, columnId]));
  };

  const handleShowColumn = (columnId: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      next.delete(columnId);
      return next;
    });
  };

  const handleClearColumnClick = (column: KanbanColumn) => {
    setClearingColumn(column);
    setClearDialogOpen(true);
  };

  const handleConfirmClear = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column && onClearColumn) {
      onClearColumn(column.status);
    }
  };

  const hiddenColumnsList = columns.filter(col => hiddenColumns.has(col.id));

  return (
    <>
      {/* Hidden columns indicator */}
      {hiddenColumnsList.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Hidden columns:</span>
          {hiddenColumnsList.map(col => (
            <Button
              key={col.id}
              variant="outline"
              size="sm"
              className="gap-1.5 h-7"
              onClick={() => handleShowColumn(col.id)}
            >
              <Eye className="w-3.5 h-3.5" />
              {col.name}
            </Button>
          ))}
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {visibleColumns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={columnTasks[column.status] || []}
              onOpenTask={onOpenTask}
              onAddTask={onAddTask}
              onEditColumn={() => handleEditColumn(column)}
              onHideColumn={() => handleHideColumn(column.id)}
              onClearColumn={() => handleClearColumnClick(column)}
            />
          ))}
        </div>
      </DragDropContext>

      <EditColumnDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        column={editingColumn}
        onSave={handleSaveColumn}
      />

      <ClearColumnDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        column={clearingColumn}
        taskCount={clearingColumn ? (columnTasks[clearingColumn.status]?.length || 0) : 0}
        onConfirm={handleConfirmClear}
      />
    </>
  );
}

interface BoardColumnProps {
  column: KanbanColumn;
  tasks: TaskExtended[];
  onOpenTask: (taskId: string) => void;
  onAddTask?: (status: TaskStatus) => void;
  onEditColumn: () => void;
  onHideColumn: () => void;
  onClearColumn: () => void;
}

function BoardColumn({ column, tasks, onOpenTask, onAddTask, onEditColumn, onHideColumn, onClearColumn }: BoardColumnProps) {
  const { toast } = useToast();

  return (
    <div className="flex-shrink-0 w-[300px] min-w-[280px] bg-gray-50 dark:bg-neutral-900 rounded-lg flex flex-col max-h-[calc(100vh-240px)] border border-gray-200 dark:border-gray-800">
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {/* Muted checkmark for Done column */}
          {column.status === 'Done' && (
            <CheckCircle2 className="w-4 h-4 text-green-500/60" />
          )}
          <span className={cn(
            "text-[13px] font-semibold",
            column.status === 'Done' ? 'text-green-600/70 dark:text-green-400/70' : 'text-gray-900 dark:text-gray-100'
          )}>{column.name}</span>
          <span className="px-2 py-0.5 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[11px] font-medium rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" 
                type="button"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onSelect={() => {
                  if (onAddTask) {
                    onAddTask(column.status);
                    return;
                  }
                  toast({ title: 'Add task', description: 'This action is not wired yet.' });
                }}
              >
                <Plus className="w-4 h-4" />
                Add task
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onSelect={onEditColumn}
              >
                <Settings className="w-4 h-4" />
                Edit column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onSelect={onHideColumn}
              >
                <EyeOff className="w-4 h-4" />
                Hide column
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                onSelect={onClearColumn}
                disabled={tasks.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                Clear column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
