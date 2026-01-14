// ============================================================
// KANBAN BOARD COMPONENT
// Main board with drag-and-drop, search, and swimlane grouping
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
import { KanbanFilters, SwimlaneGrouping, KanbanViewMode } from './KanbanFilters';
import { AddColumnButton } from './AddColumnButton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, User, Flag, Layers } from 'lucide-react';

interface KanbanBoardProps {
  onTaskClick?: (task: any) => void;
  onTaskEdit?: (task: any) => void;
  onTaskDelete?: (taskId: string) => void;
  onAddTask?: (statusId?: string) => void;
}

export function KanbanBoard({
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
}: KanbanBoardProps) {
  // Filters state
  const [filters, setFilters] = useState<KanbanTaskFilters>({
    search: '',
    priority: 'all',
    assignee_id: 'all',
    workstream_id: 'all',
  });
  const [swimlane, setSwimlane] = useState<SwimlaneGrouping>('none');
  const [viewMode, setViewMode] = useState<KanbanViewMode>('board');

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

  // Group tasks by swimlane
  const swimlaneGroups = useMemo(() => {
    if (swimlane === 'none') {
      return [{ key: 'all', label: 'All Tasks', tasks }];
    }

    const groups: Record<string, { label: string; tasks: KanbanTask[] }> = {};

    tasks.forEach((task) => {
      let groupKey: string;
      let groupLabel: string;

      switch (swimlane) {
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
  }, [tasks, swimlane]);

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
    setFilters((prev) => ({ ...prev, ...newFilters }));
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
    switch (swimlane) {
      case 'assignee': return <User className="w-4 h-4" />;
      case 'priority': return <Flag className="w-4 h-4" />;
      case 'workstream': return <Layers className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-background">
        <KanbanFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          taskCount={tasks.length}
          swimlane={swimlane}
          onSwimlaneChange={setSwimlane}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Board */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {viewMode === 'board' ? (
            // Standard Board View
            swimlane === 'none' ? (
              // No swimlanes - flat board
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
              // Swimlane grouped board
              <div className="p-4 space-y-6">
                {swimlaneGroups.map((group) => (
                  <div key={group.key} className="space-y-2">
                    {/* Swimlane Header */}
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
                      {getSwimlaneIcon()}
                      <span className="font-medium text-sm">{group.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({group.tasks.length})
                      </span>
                    </div>
                    {/* Swimlane Columns */}
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {statuses.map((status) => (
                        <KanbanColumn
                          key={`${group.key}-${status.id}`}
                          status={status}
                          tasks={getTasksByStatus(group.tasks)[status.id] || []}
                          onTaskClick={onTaskClick}
                          onTaskEdit={onTaskEdit}
                          onTaskDelete={onTaskDelete}
                          onAddTask={onAddTask}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Swimlane View Mode - horizontal rows grouped by workstream/assignee
            <div className="p-4 space-y-4">
              {swimlaneGroups.map((group) => (
                <div key={group.key} className="border border-border rounded-xl overflow-hidden">
                  {/* Swimlane Header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
                    {getSwimlaneIcon()}
                    <span className="font-semibold text-sm">{group.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {group.tasks.length} tasks
                    </span>
                  </div>
                  
                  {/* Swimlane Body - Horizontal columns */}
                  <div className="flex gap-0 overflow-x-auto bg-muted/30">
                    {statuses.map((status, idx) => {
                      const columnTasks = getTasksByStatus(group.tasks)[status.id] || [];
                      return (
                        <div 
                          key={status.id} 
                          className={`flex-1 min-w-[200px] p-3 ${idx < statuses.length - 1 ? 'border-r border-border' : ''}`}
                        >
                          {/* Mini Column Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            <span className="text-xs font-medium text-muted-foreground">{status.name}</span>
                            <span className="text-xs text-muted-foreground">({columnTasks.length})</span>
                          </div>
                          
                          {/* Tasks */}
                          <div className="space-y-2">
                            {columnTasks.length > 0 ? (
                              columnTasks.map((task) => (
                                <div
                                  key={task.id}
                                  onClick={() => onTaskClick?.(task)}
                                  className="p-2 bg-card rounded-lg border border-border cursor-pointer hover:shadow-sm transition-shadow"
                                >
                                  <div className="text-xs text-muted-foreground mb-1">{task.key}</div>
                                  <div className="text-sm font-medium line-clamp-2">{task.title}</div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-muted-foreground text-center py-4">No tasks</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
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
