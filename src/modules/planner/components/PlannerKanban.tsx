// ============================================================
// PLANNER KANBAN BOARD
// Drag-and-drop Kanban with WIP limits and spring animations
// ============================================================

import { useMemo, useState } from 'react';
import { 
  DndContext, 
  closestCenter, 
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, Lock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannerTask, TaskStatus, ColumnConfig } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface PlannerKanbanProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
}

// Sortable Task Card
function TaskCard({ 
  task, 
  onClick,
  isDragging = false,
}: { 
  task: PlannerTask; 
  onClick: () => void;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const subtasksDone = task.subtasks.filter(s => s.completed).length;
  const subtasksTotal = task.subtasks.length;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-lg border shadow-sm p-3 cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        task.blocked && "border-l-4 border-l-red-500",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Header: ID + Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono text-text-muted bg-surface-1 px-1.5 py-0.5 rounded">
          {task.key}
        </span>
        <div className="flex items-center gap-1">
          {task.blocked && (
            <Lock className="w-3.5 h-3.5 text-red-500" />
          )}
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: priorityConfig.color }}
            title={priorityConfig.label}
          />
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-text-primary line-clamp-2 mb-2">
        {task.title}
      </h4>

      {/* Subtasks Progress */}
      {subtasksTotal > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
            <span>{subtasksDone} of {subtasksTotal}</span>
          </div>
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(subtasksDone / subtasksTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Due Date + Assignee */}
      <div className="flex items-center justify-between mt-2">
        {task.dueDate && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium",
            new Date(task.dueDate) < new Date() 
              ? "bg-red-100 text-red-700" 
              : "bg-surface-1 text-text-muted"
          )}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.assigneeInitials && (
          <div 
            className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-medium"
            title={task.assigneeName}
          >
            {task.assigneeInitials}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Kanban Column
function KanbanColumn({
  config,
  tasks,
  onTaskClick,
}: {
  config: ColumnConfig;
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}) {
  const isOverWipLimit = config.wipLimit && tasks.length > config.wipLimit;

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-surface-1 rounded-xl">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: config.color }}
          />
          <span className="font-medium text-sm text-text-primary">{config.title}</span>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium",
            isOverWipLimit 
              ? "bg-red-100 text-red-700" 
              : "bg-surface-2 text-text-muted"
          )}>
            {tasks.length}
            {config.wipLimit && `/${config.wipLimit}`}
          </span>
        </div>
        <button className="p-1 rounded hover:bg-surface-2 text-text-muted">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* WIP Warning */}
      {isOverWipLimit && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[11px] text-red-600 font-medium">
            WIP limit exceeded
          </span>
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick(task)}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="h-24 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
            <span className="text-xs text-text-muted">Drop tasks here</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlannerKanban({ tasks, onTaskClick, onTaskMove }: PlannerKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, PlannerTask[]> = {
      'backlog': [],
      'planned': [],
      'in-progress': [],
      'review': [],
      'done': [],
    };

    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Find which column the task was dropped into
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask && overTask.status !== task.status) {
      onTaskMove(taskId, overTask.status);
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto h-full">
        {COLUMN_CONFIG.map(config => (
          <KanbanColumn
            key={config.id}
            config={config}
            tasks={tasksByStatus[config.id]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} onClick={() => {}} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}
