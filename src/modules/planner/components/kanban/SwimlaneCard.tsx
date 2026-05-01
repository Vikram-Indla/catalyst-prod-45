// ============================================================
// SWIMLANE CARD COMPONENT
// Compact task card for swimlane view with drag support
// ============================================================

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanTask } from '../../types/kanban';
import { PRIORITY_STYLES } from '../../types/kanban';
import { cn } from '@/lib/utils';

interface SwimlaneCardProps {
  task: KanbanTask;
  onClick?: () => void;
  accentColor?: string;
}

export function SwimlaneCard({ task, onClick, accentColor }: SwimlaneCardProps) {
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

  const isCompleted = task.status?.is_completed_status;
  const priorityStyle = PRIORITY_STYLES[task.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group p-2.5 bg-card rounded-lg cursor-pointer overflow-hidden",
        "border border-border relative",
        "hover:border-primary/50 hover:shadow-md transition-all duration-150",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Left accent stripe - priority or workstream color */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: accentColor || priorityStyle.borderLeft }}
      />
      
      {/* Task Key */}
      <div className="flex items-center gap-2 mb-1 pl-1">
        <span className="text-[10px] font-mono text-primary font-semibold">
          {task.key}
        </span>
        {/* Priority indicator */}
        <span className="text-[10px]">
          {task.priority === 'critical' && '⚠️'}
          {task.priority === 'high' && '🔥'}
        </span>
      </div>
      
      {/* Title */}
      <h4 
        className={cn(
          "text-xs font-medium text-foreground line-clamp-2 pl-1",
          isCompleted && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </h4>
      
      {/* Footer - Assignee avatar */}
      {task.assignee && (
        <div className="flex items-center justify-end mt-2">
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: accentColor || 'var(--ds-text-subtlest, #64748b)' }}
            title={task.assignee.full_name || undefined}
          >
            {(task.assignee.full_name || 'U').slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}
