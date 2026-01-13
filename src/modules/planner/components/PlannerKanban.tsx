// ============================================================
// PLANNER KANBAN BOARD
// Enhanced Kanban with Group By, column management, improved cards
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
  arrayMove,
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
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannerTask, TaskStatus, ColumnConfig, GroupByOption, PlannerUser } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG, DUE_DATE_GROUPS } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SEED_USERS } from '../data/seedData';
import { differenceInDays, startOfDay, startOfWeek, endOfWeek, isWithinInterval, addWeeks } from 'date-fns';

interface PlannerKanbanProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
}

interface DynamicColumn {
  id: string;
  title: string;
  color: string;
  wipLimit?: number;
  tasks: PlannerTask[];
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
  groupBy,
}: {
  column: DynamicColumn;
  onTaskClick: (task: PlannerTask) => void;
  isOver: boolean;
  groupBy: GroupByOption;
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
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
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

export function PlannerKanban({ tasks, onTaskClick, onTaskMove }: PlannerKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByOption>('status');
  const [columnOrder, setColumnOrder] = useState<string[]>(COLUMN_CONFIG.map(c => c.id));
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  // Generate dynamic columns based on groupBy
  const columns = useMemo((): DynamicColumn[] => {
    switch (groupBy) {
      case 'status':
        return COLUMN_CONFIG.map(col => ({
          id: col.id,
          title: col.title,
          color: col.color,
          wipLimit: col.wipLimit,
          tasks: tasks.filter(t => t.status === col.id),
        }));
      
      case 'assignee':
        const assigneeMap = new Map<string, PlannerTask[]>();
        tasks.forEach(task => {
          const key = task.assigneeId || 'unassigned';
          if (!assigneeMap.has(key)) assigneeMap.set(key, []);
          assigneeMap.get(key)!.push(task);
        });
        
        const assigneeColumns: DynamicColumn[] = [];
        // Unassigned first
        if (assigneeMap.has('unassigned')) {
          assigneeColumns.push({
            id: 'unassigned',
            title: 'Unassigned',
            color: '#6b7280',
            tasks: assigneeMap.get('unassigned')!,
          });
        }
        // Then each user
        SEED_USERS.forEach(user => {
          if (assigneeMap.has(user.id)) {
            assigneeColumns.push({
              id: user.id,
              title: user.name,
              color: '#2563eb',
              tasks: assigneeMap.get(user.id)!,
            });
          }
        });
        return assigneeColumns;
      
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
        
        const reporterColumns: DynamicColumn[] = [];
        // Unknown first
        if (reporterMap.has('unknown')) {
          reporterColumns.push({
            id: 'unknown',
            title: 'Unknown',
            color: '#6b7280',
            tasks: reporterMap.get('unknown')!,
          });
        }
        // Then each user
        SEED_USERS.forEach(user => {
          if (reporterMap.has(user.id)) {
            reporterColumns.push({
              id: user.id,
              title: user.name,
              color: '#0d9488',
              tasks: reporterMap.get(user.id)!,
            });
          }
        });
        return reporterColumns;
      
      case 'dueDate':
        return DUE_DATE_GROUPS.map(group => ({
          id: group.id,
          title: group.title,
          color: group.color,
          tasks: tasks.filter(t => getDueDateGroup(t) === group.id),
        }));
      
      default:
        return [];
    }
  }, [tasks, groupBy]);

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
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        // Find which column this task is in
        const col = columns.find(c => c.tasks.some(t => t.id === overId));
        if (col) setOverColumnId(col.id);
      }
    }
  }, [tasks, columns]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    setOverColumnId(null);
    
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const overId = over.id as string;
    let targetColumnId: string | null = null;

    if (overId.startsWith('column-')) {
      targetColumnId = overId.replace('column-', '');
    } else {
      const col = columns.find(c => c.tasks.some(t => t.id === overId));
      if (col) targetColumnId = col.id;
    }

    // Only handle status changes when grouped by status
    if (groupBy === 'status' && targetColumnId && targetColumnId !== task.status) {
      onTaskMove(taskId, targetColumnId as TaskStatus);
    }
  }, [tasks, columns, groupBy, onTaskMove]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar with Group By */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Group by:</span>
        </div>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="assignee">Assignee</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="reporter">Reporter</SelectItem>
            <SelectItem value="dueDate">Due Date</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="ml-auto text-xs text-muted-foreground">
          {tasks.length} tasks across {columns.length} columns
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 overflow-x-auto flex-1">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              onTaskClick={onTaskClick}
              isOver={overColumnId === column.id}
              groupBy={groupBy}
            />
          ))}
          
          {/* Add Column Button */}
          {groupBy === 'status' && (
            <div className="flex-shrink-0 w-[280px]">
              <button className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">Add Column</span>
              </button>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-3 shadow-2xl">
              <TaskCard task={activeTask} onClick={() => {}} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
