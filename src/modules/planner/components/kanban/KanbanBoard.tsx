// ============================================================
// KANBAN BOARD COMPONENT
// Main board with drag-and-drop and swimlane view modes
// Filters provided by parent PlannerSearchBar (no duplicate filters)
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
import { SwimlaneRow } from './SwimlaneRow';
import { AddColumnButton } from './AddColumnButton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, LayoutGrid, Rows3, User, Flag, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SwimlaneGrouping = 'none' | 'assignee' | 'priority' | 'workstream';
export type KanbanViewMode = 'board' | 'swimlane';

interface KanbanBoardProps {
  onTaskClick?: (task: any) => void;
  onTaskEdit?: (task: any) => void;
  onTaskDelete?: (taskId: string) => void;
  onAddTask?: (statusId?: string) => void;
  // External filters from parent (PlannerPage)
  externalWorkstreamId?: string | null;
  externalSearch?: string;
  externalPriority?: string | null;
  externalAssigneeId?: string | null;
}

export function KanbanBoard({
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
  externalWorkstreamId,
  externalSearch,
  externalPriority,
  externalAssigneeId,
}: KanbanBoardProps) {
  // Internal filters state (merged with external)
  const [internalFilters, setInternalFilters] = useState<KanbanTaskFilters>({
    search: '',
    priority: 'all',
    assignee_id: 'all',
    workstream_id: 'all',
  });
  const [swimlane, setSwimlane] = useState<SwimlaneGrouping>('workstream');
  const [viewMode, setViewMode] = useState<KanbanViewMode>('board');
  
  // Collapsed swimlane rows state
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  
  const toggleRowCollapse = useCallback((key: string) => {
    setCollapsedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);
  
  // Merge internal and external filters - external takes precedence
  const filters: KanbanTaskFilters = useMemo(() => ({
    search: externalSearch || internalFilters.search,
    priority: (externalPriority as KanbanTaskFilters['priority']) || internalFilters.priority,
    assignee_id: externalAssigneeId || internalFilters.assignee_id,
    workstream_id: externalWorkstreamId || internalFilters.workstream_id,
  }), [externalSearch, externalPriority, externalAssigneeId, externalWorkstreamId, internalFilters]);

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

  // Group tasks by swimlane - respect user's explicit choice
  const effectiveSwimlane = swimlane;
  
  const swimlaneGroups = useMemo(() => {
    if (effectiveSwimlane === 'none') {
      return [{ key: 'all', label: 'All Tasks', tasks }];
    }

    const groups: Record<string, { label: string; tasks: KanbanTask[] }> = {};

    tasks.forEach((task) => {
      let groupKey: string;
      let groupLabel: string;

      switch (effectiveSwimlane) {
        case 'assignee':
          groupKey = task.assignee?.id || 'unassigned';
          groupLabel = task.assignee?.full_name || 'Unassigned';
          break;
        case 'priority':
          groupKey = task.priority || 'none';
          groupLabel = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'No Priority';
          break;
        case 'workstream':
          groupKey = task.workstream?.id || 'none';
          groupLabel = task.workstream?.name || 'No Workstream';
          break;
        default:
          groupKey = 'all';
          groupLabel = 'All Tasks';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { label: groupLabel, tasks: [] };
      }
      groups[groupKey].tasks.push(task);
    });

    // Sort groups
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'unassigned' || a === 'none') return 1;
      if (b === 'unassigned' || b === 'none') return -1;
      return groups[a].label.localeCompare(groups[b].label);
    });

    return sortedKeys.map((key) => ({
      key,
      label: groups[key].label,
      tasks: groups[key].tasks,
    }));
  }, [tasks, effectiveSwimlane]);

  // Group tasks by status for a given swimlane
  const getTasksByStatus = useCallback((swimlaneTasks: KanbanTask[]) => {
    const grouped: Record<string, KanbanTask[]> = {};
    statuses.forEach((status) => {
      grouped[status.id] = swimlaneTasks
        .filter((t) => t.status_id === status.id)
        .sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [statuses]);

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

    // Determine target status
    let targetStatusId: string;
    let targetPosition: number;

    // Check if dropping on a swimlane cell (format: "groupKey:statusId")
    if (overId.includes(':')) {
      const [, statusId] = overId.split(':');
      const targetStatus = statuses.find((s) => s.id === statusId);
      if (targetStatus) {
        targetStatusId = targetStatus.id;
        const tasksInColumn = tasks.filter((t) => t.status_id === targetStatusId);
        targetPosition = tasksInColumn.length;
      } else {
        return;
      }
    } else {
      // Check if dropping on a column
      const targetStatus = statuses.find((s) => s.id === overId);
      if (targetStatus) {
        targetStatusId = targetStatus.id;
        const tasksInColumn = tasks.filter((t) => t.status_id === targetStatusId);
        targetPosition = tasksInColumn.length;
      } else {
        // Dropping on another task
        const overTask = tasks.find((t) => t.id === overId);
        if (!overTask) return;
        
        targetStatusId = overTask.status_id;
        targetPosition = overTask.position;
      }
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
  }, [tasks, statuses, moveTask]);

  const handleFilterChange = useCallback((newFilters: Partial<KanbanTaskFilters>) => {
    setInternalFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const isLoading = statusesLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getSwimlaneIcon = () => {
    switch (effectiveSwimlane) {
      case 'assignee': return <User className="w-4 h-4" />;
      case 'priority': return <Flag className="w-4 h-4" />;
      case 'workstream': return <Layers className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact View Toggle - Board/Swimlane only */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-background flex items-center gap-3">
        <div className="flex items-center bg-muted/50 border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
              viewMode === 'board'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Board
          </button>
          <button
            onClick={() => setViewMode('swimlane')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
              viewMode === 'swimlane'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Rows3 className="w-4 h-4" />
            Swimlane
          </button>
        </div>
      </div>
      
      {/* Board Content */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {viewMode === 'board' ? (
            // Standard Board View - always flat, no swimlane grouping in board mode
            <div className="flex gap-4 p-4 min-h-full">
              {statuses.map((status) => (
                <KanbanColumn
                  key={status.id}
                  status={status}
                  tasks={getTasksByStatus(tasks)[status.id] || []}
                  onTaskClick={onTaskClick}
                  onTaskEdit={onTaskEdit}
                  onTaskDelete={onTaskDelete}
                  onAddTask={onAddTask}
                />
              ))}
              {/* Add Column Button */}
              <AddColumnButton />
            </div>
          ) : (
            // Swimlane View Mode - horizontal rows grouped by workstream/assignee
            <div className="p-4 space-y-4">
              {swimlaneGroups.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No tasks match the current filters
                </div>
              ) : (
                swimlaneGroups.map((group) => (
                  <SwimlaneRow
                    key={group.key}
                    groupKey={group.key}
                    groupLabel={group.label}
                    tasks={group.tasks}
                    statuses={statuses}
                    isCollapsed={collapsedRows.has(group.key)}
                    onToggleCollapse={() => toggleRowCollapse(group.key)}
                    onTaskClick={onTaskClick}
                    swimlaneType={effectiveSwimlane}
                  />
                ))
              )}
            </div>
          )}

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
