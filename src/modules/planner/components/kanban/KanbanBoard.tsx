// ============================================================
// KANBAN BOARD COMPONENT
// Main board with drag-and-drop and swimlane view modes
// Supports both TASK and COLUMN drag-and-drop
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
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { KanbanTask, KanbanTaskFilters, PlannerStatus } from '../../types/kanban';
import { useKanbanStatuses, useKanbanStatusesRealtime, useReorderKanbanStatuses } from '../../hooks/useKanbanStatuses';
import { useKanbanTasks, useKanbanTasksRealtime, useMoveKanbanTask } from '../../hooks/useKanbanTasks';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { SwimlaneRow } from './SwimlaneRow';
import { AddColumnButton } from './AddColumnButton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, User, Flag, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SwimlaneGrouping = 'none' | 'assignee' | 'priority' | 'workstream';
export type KanbanViewMode = 'board' | 'swimlane';

// Drag item types for differentiating tasks vs columns
type DragItemType = 'task' | 'column';

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
  externalStatusSlug?: string | null;
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
  externalStatusSlug,
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
    status_slug: externalStatusSlug || null,
  }), [externalSearch, externalPriority, externalAssigneeId, externalWorkstreamId, externalStatusSlug, internalFilters]);

  // Data hooks
  const { data: statuses = [], isLoading: statusesLoading } = useKanbanStatuses();
  const { data: tasks = [], isLoading: tasksLoading } = useKanbanTasks(filters);
  const moveTask = useMoveKanbanTask();
  const reorderStatuses = useReorderKanbanStatuses();

  // Realtime subscriptions
  useKanbanStatusesRealtime();
  useKanbanTasksRealtime();

  // Drag state - track both tasks and columns
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [activeColumn, setActiveColumn] = useState<PlannerStatus | null>(null);
  const [dragItemType, setDragItemType] = useState<DragItemType | null>(null);

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

  // Column IDs for sortable context
  const columnIds = useMemo(() => statuses.map(s => `column-${s.id}`), [statuses]);

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
    const activeId = event.active.id as string;
    
    // Check if dragging a column (prefixed with "column-")
    if (activeId.startsWith('column-')) {
      const columnId = activeId.replace('column-', '');
      const column = statuses.find((s) => s.id === columnId);
      if (column) {
        setActiveColumn(column);
        setDragItemType('column');
        return;
      }
    }
    
    // Otherwise it's a task
    const task = tasks.find((t) => t.id === activeId);
    if (task) {
      setActiveTask(task);
      setDragItemType('task');
    }
  }, [tasks, statuses]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over for visual feedback
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset all drag states
    setActiveTask(null);
    setActiveColumn(null);
    setDragItemType(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle COLUMN drag-drop
    if (activeId.startsWith('column-') && overId.startsWith('column-')) {
      const draggedColumnId = activeId.replace('column-', '');
      const overColumnId = overId.replace('column-', '');
      
      if (draggedColumnId === overColumnId) return;
      
      const oldIndex = statuses.findIndex(s => s.id === draggedColumnId);
      const newIndex = statuses.findIndex(s => s.id === overColumnId);
      
      if (oldIndex === -1 || newIndex === -1) return;
      
      // Create new order array
      const newStatuses = [...statuses];
      const [moved] = newStatuses.splice(oldIndex, 1);
      newStatuses.splice(newIndex, 0, moved);
      
      // Update positions
      const updates = newStatuses.map((s, idx) => ({
        id: s.id,
        position: idx,
      }));
      
      reorderStatuses.mutate(updates);
      return;
    }

    // Handle TASK drag-drop
    const taskId = activeId;
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
  }, [tasks, statuses, moveTask, reorderStatuses]);

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
            // Standard Board View with horizontal column drag-drop
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
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
                    isDraggingColumn={activeColumn?.id === status.id}
                  />
                ))}
                {/* Add Column Button */}
                <AddColumnButton />
              </div>
            </SortableContext>
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

          <DragOverlay dropAnimation={null}>
            {dragItemType === 'task' && activeTask && (
              <KanbanCard task={activeTask} isDragging />
            )}
            {dragItemType === 'column' && activeColumn && (
              <div className="w-[300px] opacity-90 bg-card border border-primary rounded-xl p-4 shadow-2xl">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: activeColumn.color || '#2563eb' }}
                  />
                  <span className="font-semibold text-sm">{activeColumn.name}</span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
