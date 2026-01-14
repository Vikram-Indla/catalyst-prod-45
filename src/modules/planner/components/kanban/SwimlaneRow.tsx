// ============================================================
// SWIMLANE ROW COMPONENT
// Collapsible row for swimlane view with workstream colors
// ============================================================

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, User, Flag, Layers } from 'lucide-react';
import type { KanbanTask, PlannerStatus } from '../../types/kanban';
import { SwimlaneCard } from './SwimlaneCard';
import { cn } from '@/lib/utils';
import { getWorkstreamColor, DEFAULT_WORKSTREAM_COLOR } from '@/lib/workstream-colors';
import type { SwimlaneGrouping } from './KanbanFilters';

// Status colors for summary badges
const STATUS_DOT_COLORS: Record<string, string> = {
  'backlog': '#9ca3af',
  'planned': '#2563eb',
  'in-progress': '#d97706',
  'review': '#8b5cf6',
  'done': '#10b981',
};

interface SwimlaneRowProps {
  groupKey: string;
  groupLabel: string;
  tasks: KanbanTask[];
  statuses: PlannerStatus[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTaskClick?: (task: KanbanTask) => void;
  swimlaneType: SwimlaneGrouping;
}

export function SwimlaneRow({
  groupKey,
  groupLabel,
  tasks,
  statuses,
  isCollapsed,
  onToggleCollapse,
  onTaskClick,
  swimlaneType,
}: SwimlaneRowProps) {
  // Get workstream color based on group type
  const getGroupColor = () => {
    if (swimlaneType === 'workstream') {
      return getWorkstreamColor(groupLabel);
    }
    // For priority/assignee, use default
    return DEFAULT_WORKSTREAM_COLOR;
  };
  
  const colors = getGroupColor();
  const totalTasks = tasks.length;
  
  // Group tasks by status
  const tasksByStatus = statuses.reduce((acc, status) => {
    acc[status.id] = tasks.filter(t => t.status_id === status.id);
    return acc;
  }, {} as Record<string, KanbanTask[]>);

  // Get icon for swimlane type
  const getIcon = () => {
    switch (swimlaneType) {
      case 'assignee':
        return <User className="w-4 h-4" />;
      case 'priority':
        return <Flag className="w-4 h-4" />;
      case 'workstream':
        return <Layers className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Swimlane Header - Clickable to collapse */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 border-b border-border",
          "hover:bg-muted/50 transition-colors cursor-pointer text-left",
          !isCollapsed && "bg-muted/30"
        )}
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: colors.hex,
        }}
      >
        {/* Collapse Icon */}
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        
        {/* Group Icon */}
        <span className="text-muted-foreground flex-shrink-0">
          {getIcon()}
        </span>
        
        {/* Group Label */}
        <span className="font-semibold text-sm text-foreground flex-1 truncate">
          {groupLabel}
        </span>
        
        {/* Task Count */}
        <span 
          className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: colors.hexLight,
            color: colors.hex,
          }}
        >
          {totalTasks} task{totalTasks !== 1 ? 's' : ''}
        </span>
        
        {/* Collapsed Summary - Status breakdown */}
        {isCollapsed && (
          <div className="flex items-center gap-2 ml-4">
            {statuses.map(status => {
              const count = tasksByStatus[status.id]?.length || 0;
              if (count === 0) return null;
              const dotColor = STATUS_DOT_COLORS[status.slug] || status.color;
              return (
                <div
                  key={status.id}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </button>

      {/* Swimlane Body - Horizontal columns */}
      {!isCollapsed && (
        <div className="flex gap-0 overflow-x-auto bg-muted/20">
          {statuses.map((status, idx) => {
            const columnTasks = tasksByStatus[status.id] || [];
            const cellId = `${groupKey}:${status.id}`;
            
            return (
              <SwimlaneCell
                key={status.id}
                cellId={cellId}
                status={status}
                tasks={columnTasks}
                isLast={idx === statuses.length - 1}
                onTaskClick={onTaskClick}
                workstreamColor={colors.hex}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Swimlane Cell (Droppable column within a row)
interface SwimlaneCellProps {
  cellId: string;
  status: PlannerStatus;
  tasks: KanbanTask[];
  isLast: boolean;
  onTaskClick?: (task: KanbanTask) => void;
  workstreamColor: string;
}

function SwimlaneCell({ 
  cellId, 
  status, 
  tasks, 
  isLast, 
  onTaskClick,
  workstreamColor,
}: SwimlaneCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId });
  const taskIds = tasks.map(t => t.id);
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[180px] p-3",
        !isLast && "border-r border-border",
        isOver && "bg-primary/5"
      )}
    >
      {/* Mini Column Header */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-xs font-medium text-muted-foreground truncate">
          {status.name}
        </span>
        <span className="text-xs text-muted-foreground">
          ({tasks.length})
        </span>
      </div>
      
      {/* Tasks */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[60px]">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <SwimlaneCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
                accentColor={workstreamColor}
              />
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
