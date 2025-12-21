/**
 * SubtaskCard — Clickable card for subtask list
 * Shows type badge, title, assignee, checkbox for done status
 */

import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, Palette, Server, Plug, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Subtask, SubtaskType } from '@/types/subtask';
import { SUBTASK_TYPE_CONFIG, SUBTASK_STATUS_CONFIG } from '@/types/subtask';

interface SubtaskCardProps {
  subtask: Subtask;
  onClick: () => void;
  onToggleDone: () => void;
}

const TYPE_ICONS: Record<SubtaskType, React.ElementType> = {
  frontend: Palette,
  backend: Server,
  integration: Plug,
  technical: Settings,
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function SubtaskCard({ subtask, onClick, onToggleDone }: SubtaskCardProps) {
  const typeConfig = SUBTASK_TYPE_CONFIG[subtask.type];
  const statusConfig = SUBTASK_STATUS_CONFIG[subtask.status];
  const TypeIcon = TYPE_ICONS[subtask.type];
  const isDone = subtask.status === 'done';

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDone();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-md cursor-pointer",
        "border bg-card hover:bg-muted/50 transition-colors",
        "group"
      )}
      style={{ borderLeftWidth: '3px', borderLeftColor: typeConfig.color }}
    >
      {/* Checkbox */}
      <div onClick={handleCheckboxClick}>
        <Checkbox
          checked={isDone}
          className={cn(
            "h-5 w-5",
            isDone && "data-[state=checked]:bg-status-success data-[state=checked]:border-status-success"
          )}
        />
      </div>

      {/* Type Badge */}
      <div
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium flex-shrink-0"
        style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
      >
        <TypeIcon className="h-3 w-3" />
        <span>{typeConfig.label}</span>
      </div>

      {/* Title */}
      <span className={cn(
        "flex-1 text-sm truncate",
        isDone && "line-through text-muted-foreground"
      )}>
        {subtask.name}
      </span>

      {/* Assignee Avatar */}
      {subtask.assignee && (
        <div
          className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium flex-shrink-0"
          title={subtask.assignee.full_name}
        >
          {getInitials(subtask.assignee.full_name)}
        </div>
      )}

      {/* Release Tag */}
      {subtask.release && (
        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
          {subtask.release.name}
        </span>
      )}

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </div>
  );
}
