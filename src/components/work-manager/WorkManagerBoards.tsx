// src/components/work-manager/WorkManagerBoards.tsx
// Kanban Board View (Drag & Drop) - Enterprise Grade

import { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal, CheckCircle2, Plus, Settings, EyeOff, Trash2, Eye, Users, Calendar, User } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { users, teams } from '@/lib/work-manager-data';
import { useWorkManagerColumns } from '@/hooks/useWorkManagerColumns';
import type { TaskExtended, KanbanColumn, TaskStatus, GroupByOption, Team, User as UserType } from './types';
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

interface DynamicColumn {
  id: string;
  name: string;
  icon?: React.ReactNode;
  color?: string;
}

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
  groupBy?: GroupByOption;
  teamsData?: Team[];
  usersData?: UserType[];
}

// Due date groupings
const dueDateGroups = [
  { id: 'overdue', name: 'Overdue', color: '#dc2626' },
  { id: 'today', name: 'Due Today', color: '#ea580c' },
  { id: 'next7', name: 'Next 7 Days', color: '#ca8a04' },
  { id: 'future', name: 'Future', color: '#16a34a' },
  { id: 'none', name: 'No Due Date', color: '#6b7280' },
];

export function WorkManagerBoards({ 
  tasks, 
  onOpenTask, 
  onMoveTask, 
  onAddTask, 
  onClearColumn,
  groupBy = 'status',
  teamsData = teams,
  usersData = users,
}: WorkManagerBoardsProps) {
  const { columns: statusColumns, updateColumn } = useWorkManagerColumns();
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearingColumn, setClearingColumn] = useState<KanbanColumn | null>(null);

  // Generate columns based on groupBy option
  const dynamicColumns: DynamicColumn[] = useMemo(() => {
    switch (groupBy) {
      case 'team':
        return teamsData.map(team => ({
          id: team.id,
          name: team.name,
          color: team.color,
        }));
      case 'assignee':
        // Get unique assignees from tasks
        const assigneeIds = [...new Set(tasks.map(t => t.assigneeId))];
        return assigneeIds.map(id => {
          const user = usersData.find(u => u.id === id);
          return {
            id: id || 'unassigned',
            name: user?.name || 'Unassigned',
            color: user?.avatarColor,
          };
        });
      case 'dueDate':
        return dueDateGroups;
      case 'status':
      default:
        return statusColumns.map(col => ({
          id: col.status,
          name: col.name,
        }));
    }
  }, [groupBy, teamsData, usersData, tasks, statusColumns]);

  const visibleColumns = useMemo(() => {
    return dynamicColumns.filter(col => !hiddenColumns.has(col.id));
  }, [dynamicColumns, hiddenColumns]);

  // Group tasks based on groupBy option
  const columnTasks = useMemo(() => {
    const grouped: Record<string, TaskExtended[]> = {};
    
    dynamicColumns.forEach(col => {
      grouped[col.id] = [];
    });

    tasks.forEach(task => {
      let groupKey: string;
      switch (groupBy) {
        case 'team':
          groupKey = task.teamId;
          break;
        case 'assignee':
          groupKey = task.assigneeId || 'unassigned';
          break;
        case 'dueDate':
          groupKey = task.dueBucket || 'none';
          break;
        case 'status':
        default:
          groupKey = task.status;
          break;
      }
      if (grouped[groupKey]) {
        grouped[groupKey].push(task);
      }
    });

    // Sort by column position within each group
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.columnPosition - b.columnPosition);
    });

    return grouped;
  }, [tasks, groupBy, dynamicColumns]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // Only allow drag for status grouping
    if (groupBy !== 'status') return;

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

  const handleEditColumn = (column: DynamicColumn) => {
    if (groupBy === 'status') {
      const kanbanCol = statusColumns.find(c => c.status === column.id);
      if (kanbanCol) {
        setEditingColumn(kanbanCol);
        setEditDialogOpen(true);
      }
    }
  };

  const handleSaveColumn = (columnId: string, newName: string) => {
    updateColumn(columnId, { name: newName });
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

  const handleClearColumnClick = (column: DynamicColumn) => {
    if (groupBy === 'status') {
      const kanbanCol = statusColumns.find(c => c.status === column.id);
      if (kanbanCol) {
        setClearingColumn(kanbanCol);
        setClearDialogOpen(true);
      }
    }
  };

  const handleConfirmClear = (columnId: string) => {
    const column = statusColumns.find(c => c.id === columnId);
    if (column && onClearColumn) {
      onClearColumn(column.status);
    }
  };

  const hiddenColumnsList = dynamicColumns.filter(col => hiddenColumns.has(col.id));

  // Check if drag is enabled
  const isDragEnabled = groupBy === 'status';

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
              tasks={columnTasks[column.id] || []}
              onOpenTask={onOpenTask}
              onAddTask={groupBy === 'status' ? onAddTask : undefined}
              onEditColumn={() => handleEditColumn(column)}
              onHideColumn={() => handleHideColumn(column.id)}
              onClearColumn={() => handleClearColumnClick(column)}
              groupBy={groupBy}
              isDragEnabled={isDragEnabled}
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
  column: DynamicColumn;
  tasks: TaskExtended[];
  onOpenTask: (taskId: string) => void;
  onAddTask?: (status: TaskStatus) => void;
  onEditColumn: () => void;
  onHideColumn: () => void;
  onClearColumn: () => void;
  groupBy: GroupByOption;
  isDragEnabled: boolean;
}

function BoardColumn({ 
  column, 
  tasks, 
  onOpenTask, 
  onAddTask, 
  onEditColumn, 
  onHideColumn, 
  onClearColumn,
  groupBy,
  isDragEnabled,
}: BoardColumnProps) {
  const { toast } = useToast();

  // Get icon based on groupBy type
  const getGroupIcon = () => {
    switch (groupBy) {
      case 'team':
        return <Users className="w-4 h-4 text-muted-foreground" />;
      case 'assignee':
        return <User className="w-4 h-4 text-muted-foreground" />;
      case 'dueDate':
        return <Calendar className="w-4 h-4 text-muted-foreground" />;
      default:
        return column.id === 'Done' ? <CheckCircle2 className="w-4 h-4 text-green-500/60" /> : null;
    }
  };

  return (
    <div className="flex-shrink-0 w-[300px] min-w-[280px] bg-gradient-to-b from-muted/50 to-muted/30 dark:from-neutral-900 dark:to-neutral-900/80 rounded-xl flex flex-col max-h-[calc(100vh-240px)] border border-border dark:border-gray-800 shadow-inner-sm">
      {/* Column Header - with bottom gradient fade */}
      <div className="flex items-center justify-between p-3 border-b border-border dark:border-gray-700 bg-gradient-to-b from-card/60 to-muted/30 dark:from-gray-800/30">
        <div className="flex items-center gap-2">
          {column.color && (
            <div 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
              style={{ backgroundColor: column.color }}
            />
          )}
          {getGroupIcon()}
          <span className={cn(
            "text-[13px] font-semibold tracking-tight",
            column.id === 'Done' ? 'text-green-600/80 dark:text-green-400/70' : 'text-foreground'
          )}>{column.name}</span>
          <span className="px-2 py-0.5 bg-muted dark:bg-white/10 text-muted-foreground dark:text-gray-300 text-[11px] font-semibold rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-1.5 rounded-md hover:bg-muted dark:hover:bg-gray-700 transition-colors" 
                type="button"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover shadow-elevated">
              {groupBy === 'status' && (
                <>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onSelect={() => {
                      if (onAddTask) {
                        onAddTask(column.id as TaskStatus);
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
                </>
              )}
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onSelect={onHideColumn}
              >
                <EyeOff className="w-4 h-4" />
                Hide column
              </DropdownMenuItem>
              {groupBy === 'status' && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  onSelect={onClearColumn}
                  disabled={tasks.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear column
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Column Body - Scrollable + Droppable */}
      <Droppable droppableId={column.id} isDropDisabled={!isDragEnabled}>
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={cn(
              'flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth',
              dropSnapshot.isDraggingOver && isDragEnabled && 'bg-olive-500/10 ring-2 ring-inset ring-olive-500/20'
            )}
          >
            {tasks.length === 0 ? (
              <div className="border-2 border-dashed border-stone-300 dark:border-gray-600 rounded-xl p-8 text-center bg-stone-50/50 dark:bg-gray-800/30">
                <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-stone-400 dark:text-gray-500" />
                </div>
                <p className="text-[12px] font-medium text-stone-500 dark:text-gray-400">No tasks</p>
                <p className="text-[11px] text-stone-400 dark:text-gray-500 mt-1">
                  {isDragEnabled ? 'Drop tasks here' : 'No items in this group'}
                </p>
              </div>
            ) : (
              tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!isDragEnabled}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={cn(
                        'transition-all duration-200',
                        dragSnapshot.isDragging && 'rotate-1 scale-[1.02]'
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
