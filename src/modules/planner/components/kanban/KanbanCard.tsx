// ============================================================
// KANBAN CARD COMPONENT
// Draggable task card for the Kanban board
// Catalyst V5 semantic colors with WORKSTREAM-based left stripe
// ============================================================

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, AlertTriangle } from 'lucide-react';
import type { KanbanTask } from '../../types/kanban';
import { getProgressColor } from '../../types/kanban';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { PriorityBadge } from './PriorityBadge';
import { DueDateBadge } from './DueDateBadge';
import { AssigneeAvatar } from './AssigneeAvatar';
import { WorkstreamBadge } from './WorkstreamBadge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanCardProps {
  task: KanbanTask;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ task, onClick, onEdit, onDelete, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.status?.is_completed_status;
  const progressColor = getProgressColor(task.progress);
  
  // Get workstream color for left stripe
  const workstreamColors = getWorkstreamColor(task.workstream?.name);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group relative bg-card rounded-lg p-3 pl-4 cursor-pointer overflow-hidden',
        'border border-border',
        'hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
        task.blocked && 'border-l-4 border-l-destructive'
      )}
    >
      {/* Workstream stripe on left (4px) - only if not blocked */}
      {!task.blocked && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: workstreamColors.hex }}
        />
      )}
      
      {/* Top row: Key + Priority + Menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#2563eb] font-semibold">
            {task.key}
          </span>
          <PriorityBadge priority={task.priority} />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="text-destructive"
            >
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className={cn(
        'text-sm font-medium text-foreground mb-2 line-clamp-2',
        isCompleted && 'line-through text-muted-foreground'
      )}>
        {task.title}
      </h4>

      {/* Blocked indicator */}
      {task.blocked && (
        <div className="flex items-center gap-1.5 mb-2 text-destructive text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-medium">Blocked</span>
          {task.blocked_reason && (
            <span className="text-muted-foreground truncate">– {task.blocked_reason}</span>
          )}
        </div>
      )}

      {/* Workstream badge */}
      {task.workstream && (
        <div className="mb-2">
          <WorkstreamBadge workstream={task.workstream} />
        </div>
      )}

      {/* Progress bar - always show if progress > 0 or in progress */}
      {(task.progress > 0 || task.status?.slug === 'in-progress') && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">Progress</span>
            <span className="text-[10px] font-bold text-foreground">{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${task.progress}%`,
                backgroundColor: progressColor 
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom row: Due date, assignee */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/50">
        <DueDateBadge dueDate={task.due_date} isCompleted={isCompleted} />

        {/* Assignee - use workstream color */}
        <AssigneeAvatar profile={task.assignee} size="sm" showName={false} workstream={task.workstream} />
      </div>
    </div>
  );
}
