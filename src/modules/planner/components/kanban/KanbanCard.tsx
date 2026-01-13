// ============================================================
// KANBAN CARD COMPONENT
// Draggable task card for the Kanban board
// ============================================================

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, MessageSquare, Paperclip, AlertTriangle } from 'lucide-react';
import type { KanbanTask } from '../../types/kanban';
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group bg-card border border-border rounded-lg p-3 cursor-pointer',
        'hover:border-primary/50 hover:shadow-md transition-all duration-150',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
        task.blocked && 'border-l-4 border-l-destructive'
      )}
    >
      {/* Top row: Key + Priority + Menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground">
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

      {/* Bottom row: Due date, comments, attachments, assignee */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <DueDateBadge dueDate={task.due_date} isCompleted={isCompleted} />
          
          {/* Progress indicator */}
          {task.progress > 0 && task.progress < 100 && (
            <div className="flex items-center gap-1">
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
            </div>
          )}
        </div>

        {/* Assignee */}
        <AssigneeAvatar profile={task.assignee} size="sm" showName={false} />
      </div>
    </div>
  );
}
