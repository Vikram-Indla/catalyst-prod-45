// ============================================================
// PLANNER KANBAN BOARD
// Enhanced Kanban with horizontal swim lanes for Group By
// ============================================================

import { useMemo, useState, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter, 
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  AlertCircle, 
  MoreHorizontal, 
  Plus, 
  GripVertical,
  Pencil,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannerTask, TaskStatus, ColumnConfig, GroupByOption } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG, DUE_DATE_GROUPS } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCard } from './TaskCard';
import { AddColumnModal } from './AddColumnModal';
import { catalystToast } from '@/lib/catalystToast';
import {
  usePlannerColumns,
  usePlannerColumnsRealtime,
  useCreatePlannerColumn,
  useDeletePlannerColumn,
} from '../hooks/usePlannerColumns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SEED_USERS } from '../data/seedData';
import { differenceInDays, startOfDay, endOfWeek, isWithinInterval, addWeeks } from 'date-fns';

interface PlannerKanbanProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  groupBy?: GroupByOption;
}

interface DynamicColumn {
  id: string;
  title: string;
  color: string;
  wipLimit?: number;
  tasks: PlannerTask[];
  isCustom?: boolean;
}

interface SwimLane {
  id: string;
  title: string;
  color: string;
  tasks: PlannerTask[];
  collapsed?: boolean;
}

// Sortable wrapper for task card
function SortableTaskCard({ 
  task, 
  onClick 
}: { 
  task: PlannerTask; 
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

// Droppable Kanban Column
function KanbanColumn({
  column,
  onTaskClick,
  isOver,
  onDelete,
}: {
  column: DynamicColumn;
  onTaskClick: (task: PlannerTask) => void;
  isOver: boolean;
  onDelete?: (columnId: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      columnId: column.id,
    },
  });

  const isOverWipLimit = column.wipLimit && column.tasks.length > column.wipLimit;

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[300px] flex flex-col bg-muted/50 rounded-xl transition-all duration-200",
        isOver && "ring-2 ring-primary ring-offset-2 bg-primary/5"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: column.color }}
          />
          <span className="font-medium text-sm text-foreground">{column.title}</span>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium",
            isOverWipLimit 
              ? "bg-destructive/10 text-destructive" 
              : "bg-muted text-muted-foreground"
          )}>
            {column.tasks.length}
            {column.wipLimit && `/${column.wipLimit}`}
          </span>
        </div>
        
        {/* Column Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-muted text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50 w-44">
            <DropdownMenuItem>
              <Pencil className="w-4 h-4 mr-2" />
              Rename Column
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Set WIP Limit
            </DropdownMenuItem>
            {column.isCustom && onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => onDelete(column.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Column
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* WIP Warning */}
      {isOverWipLimit && (
        <div className="px-3 py-2 bg-destructive/5 border-b border-destructive/20 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-[11px] text-destructive font-medium">
            WIP limit exceeded
          </span>
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {column.tasks.map(task => (
              <SortableTaskCard 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick(task)}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {column.tasks.length === 0 && (
          <div className={cn(
            "h-24 flex items-center justify-center border-2 border-dashed rounded-lg transition-all",
            isOver ? "border-primary bg-primary/5" : "border-border"
          )}>
            <span className="text-xs text-muted-foreground">
              {isOver ? "Drop here" : "No tasks"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Horizontal Swim Lane Component
function SwimLaneRow({
  lane,
  statusColumns,
  onTaskClick,
  overColumnId,
  collapsed,
  onToggleCollapse,
}: {
  lane: SwimLane;
  statusColumns: ColumnConfig[];
  onTaskClick: (task: PlannerTask) => void;
  overColumnId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  // Group tasks by status within this lane
  const tasksByStatus = useMemo(() => {
    const map: Record<string, PlannerTask[]> = {};
    statusColumns.forEach(col => {
      map[col.id] = lane.tasks.filter(t => t.status === col.id);
    });
    return map;
  }, [lane.tasks, statusColumns]);

  const totalTasks = lane.tasks.length;

  return (
    <div className="border-b border-border">
      {/* Swim Lane Header */}
      <div 
        className="flex items-center gap-2 px-4 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleCollapse}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: lane.color }}
        />
        <span className="font-medium text-sm text-foreground">{lane.title}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {totalTasks}
        </span>
      </div>

      {/* Swim Lane Content - Status Columns */}
      {!collapsed && (
        <div className="flex">
          {statusColumns.map(col => {
            const colTasks = tasksByStatus[col.id] || [];
            const isOver = overColumnId === `${lane.id}-${col.id}`;
            
            return (
              <SwimLaneCell
                key={col.id}
                laneId={lane.id}
                columnId={col.id}
                tasks={colTasks}
                onTaskClick={onTaskClick}
                isOver={isOver}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Individual cell in a swim lane (intersection of lane and status)
function SwimLaneCell({
  laneId,
  columnId,
  tasks,
  onTaskClick,
  isOver,
}: {
  laneId: string;
  columnId: string;
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `cell-${laneId}-${columnId}`,
    data: {
      type: 'cell',
      laneId,
      columnId,
    },
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[200px] border-r border-border last:border-r-0 p-2 min-h-[100px]",
        isOver && "bg-primary/5"
      )}
    >
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map(task => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
            />
          ))}
        </div>
      </SortableContext>

      {tasks.length === 0 && (
        <div className={cn(
          "h-16 flex items-center justify-center border border-dashed rounded-lg transition-all",
          isOver ? "border-primary bg-primary/5" : "border-border/50"
        )}>
          <span className="text-[10px] text-muted-foreground">
            {isOver ? "Drop here" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export function PlannerKanban({ tasks, onTaskClick, onTaskMove, groupBy }: PlannerKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  // ===== Custom columns from backend =====
  const { data: customColumns = [], isLoading: columnsLoading } = usePlannerColumns();
  usePlannerColumnsRealtime(); // realtime sync

  const createColumn = useCreatePlannerColumn();
  const deleteColumnMutation = useDeletePlannerColumn();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Combine default and custom columns (for status grouping)
  const allColumnConfigs = useMemo(() => {
    const combined = [...COLUMN_CONFIG];
    customColumns.forEach((custom, idx) => {
      combined.push({ ...custom, order: COLUMN_CONFIG.length + idx });
    });
    return combined;
  }, [customColumns]);

  // Get due date group for a task
  const getDueDateGroup = (task: PlannerTask): string => {
    if (!task.dueDate) return 'noDueDate';
    
    const today = startOfDay(new Date());
    const dueDate = startOfDay(new Date(task.dueDate));
    const daysUntil = differenceInDays(dueDate, today);
    
    if (daysUntil < 0) return 'overdue';
    if (daysUntil === 0) return 'today';
    
    const thisWeekEnd = endOfWeek(today);
    const nextWeekEnd = endOfWeek(addWeeks(today, 1));
    
    if (isWithinInterval(dueDate, { start: today, end: thisWeekEnd })) return 'thisWeek';
    if (isWithinInterval(dueDate, { start: addWeeks(today, 1), end: nextWeekEnd })) return 'nextWeek';
    
    return 'later';
  };

  // Handle adding a new column (persist to backend)
  const handleAddColumn = useCallback(
    (column: Omit<ColumnConfig, 'order'>) => {
      createColumn.mutate(column, {
        onSuccess: () => {
          catalystToast.success('Column Added', `"${column.title}" column has been created.`);
        },
        onError: (err) => {
          console.error('Failed to add column:', err);
          catalystToast.error('Failed to Add Column', 'Please try again.');
        },
      });
    },
    [createColumn]
  );

  // Handle deleting a custom column
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      deleteColumnMutation.mutate(columnId, {
        onSuccess: () => {
          catalystToast.success('Column Deleted', 'The column has been removed.');
        },
        onError: (err) => {
          console.error('Failed to delete column:', err);
          catalystToast.error('Failed to Delete Column', 'Please try again.');
        },
      });
    },
    [deleteColumnMutation]
  );

  // Generate swim lanes based on groupBy
  const swimLanes = useMemo((): SwimLane[] => {
    if (!groupBy) return [];

    switch (groupBy) {
      case 'assignee':
        const assigneeMap = new Map<string, PlannerTask[]>();
        tasks.forEach(task => {
          const key = task.assigneeId || 'unassigned';
          if (!assigneeMap.has(key)) assigneeMap.set(key, []);
          assigneeMap.get(key)!.push(task);
        });
        
        const assigneeLanes: SwimLane[] = [];
        if (assigneeMap.has('unassigned')) {
          assigneeLanes.push({
            id: 'unassigned',
            title: 'Unassigned',
            color: '#6b7280',
            tasks: assigneeMap.get('unassigned')!,
          });
        }
        SEED_USERS.forEach(user => {
          if (assigneeMap.has(user.id)) {
            assigneeLanes.push({
              id: user.id,
              title: user.name,
              color: '#2563eb',
              tasks: assigneeMap.get(user.id)!,
            });
          }
        });
        return assigneeLanes;
      
      case 'priority':
        return (['critical', 'high', 'medium', 'low'] as const).map(priority => ({
          id: priority,
          title: PRIORITY_CONFIG[priority].label,
          color: PRIORITY_CONFIG[priority].color,
          tasks: tasks.filter(t => t.priority === priority),
        }));
      
      case 'reporter':
        const reporterMap = new Map<string, PlannerTask[]>();
        tasks.forEach(task => {
          const key = task.reporterId || 'unknown';
          if (!reporterMap.has(key)) reporterMap.set(key, []);
          reporterMap.get(key)!.push(task);
        });
        
        const reporterLanes: SwimLane[] = [];
        if (reporterMap.has('unknown')) {
          reporterLanes.push({
            id: 'unknown',
            title: 'Unknown',
            color: '#6b7280',
            tasks: reporterMap.get('unknown')!,
          });
        }
        SEED_USERS.forEach(user => {
          if (reporterMap.has(user.id)) {
            reporterLanes.push({
              id: user.id,
              title: user.name,
              color: '#0d9488',
              tasks: reporterMap.get(user.id)!,
            });
          }
        });
        return reporterLanes;
      
      case 'dueDate':
        return DUE_DATE_GROUPS.map(group => ({
          id: group.id,
          title: group.title,
          color: group.color,
          tasks: tasks.filter(t => getDueDateGroup(t) === group.id),
        }));

      case 'status':
        // For status grouping, we show columns (vertical), not swim lanes
        return [];
      
      default:
        return [];
    }
  }, [tasks, groupBy]);

  // Generate vertical columns (when no groupBy or groupBy is status)
  const columns = useMemo((): DynamicColumn[] => {
    if (groupBy && groupBy !== 'status') return []; // Using swim lanes instead

    return allColumnConfigs.map(col => ({
      id: col.id,
      title: col.title,
      color: col.color,
      wipLimit: col.wipLimit,
      tasks: tasks.filter(t => t.status === col.id),
      isCustom: !COLUMN_CONFIG.some(dc => dc.id === col.id),
    }));
  }, [tasks, groupBy, allColumnConfigs]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overId = over.id as string;
    if (overId.startsWith('column-')) {
      setOverColumnId(overId.replace('column-', ''));
    } else if (overId.startsWith('cell-')) {
      // Extract laneId-columnId from cell-laneId-columnId
      setOverColumnId(overId.replace('cell-', ''));
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        if (groupBy && groupBy !== 'status') {
          // Find which cell this task is in
          setOverColumnId(`${overTask.assigneeId || 'unassigned'}-${overTask.status}`);
        } else {
          setOverColumnId(overTask.status);
        }
      }
    }
  }, [tasks, groupBy]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    setOverColumnId(null);
    
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const overId = over.id as string;
    let targetStatus: string | null = null;

    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '');
    } else if (overId.startsWith('cell-')) {
      // Extract status from cell-laneId-status
      const parts = overId.replace('cell-', '').split('-');
      targetStatus = parts[parts.length - 1]; // Last part is the status
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && targetStatus !== task.status) {
      onTaskMove(taskId, targetStatus as TaskStatus);
    }
  }, [tasks, onTaskMove]);

  const toggleLaneCollapse = useCallback((laneId: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      if (next.has(laneId)) {
        next.delete(laneId);
      } else {
        next.add(laneId);
      }
      return next;
    });
  }, []);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  // Use swim lane layout when groupBy is set (except for status)
  const useSwimLanes = groupBy && groupBy !== 'status' && swimLanes.length > 0;

  return (
    <div className="flex flex-col h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {useSwimLanes ? (
          /* Horizontal Swim Lane Layout */
          <div className="flex-1 overflow-auto">
            {/* Column Headers */}
            <div className="sticky top-0 z-10 bg-background border-b border-border flex">
              <div className="w-[200px] shrink-0" /> {/* Space for lane header */}
              {COLUMN_CONFIG.map(col => (
                <div 
                  key={col.id}
                  className="flex-1 min-w-[200px] px-3 py-2 border-r border-border last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{col.title}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Swim Lanes */}
            <div>
              {swimLanes.map(lane => (
                <SwimLaneRow
                  key={lane.id}
                  lane={lane}
                  statusColumns={COLUMN_CONFIG}
                  onTaskClick={onTaskClick}
                  overColumnId={overColumnId}
                  collapsed={collapsedLanes.has(lane.id)}
                  onToggleCollapse={() => toggleLaneCollapse(lane.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Vertical Column Layout (default) */
          <div className="flex gap-4 p-4 overflow-x-auto flex-1">
            {columns.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                onTaskClick={onTaskClick}
                isOver={overColumnId === column.id}
                onDelete={column.isCustom ? handleDeleteColumn : undefined}
              />
            ))}
            
            {/* Add Column Button */}
            {(!groupBy || groupBy === 'status') && (
              <div className="flex-shrink-0 w-[280px]">
                <button 
                  onClick={() => setIsAddColumnOpen(true)}
                  className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">Add Column</span>
                </button>
              </div>
            )}
          </div>
        )}

        <DragOverlay>
          {activeTask && (
            <div className="rotate-3 shadow-2xl">
              <TaskCard task={activeTask} onClick={() => {}} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Add Column Modal */}
      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        onAdd={handleAddColumn}
        existingColumns={allColumnConfigs}
      />
    </div>
  );
}
