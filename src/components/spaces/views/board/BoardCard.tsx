// ════════════════════════════════════════════════════════════════════════════
// BOARD CARD
// ════════════════════════════════════════════════════════════════════════════

import { Bug, BookOpen, CheckSquare, Layers, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '../../shared/UserAvatar';
import type { WorkItem } from '@/types/spaces';

interface BoardCardProps {
  item: WorkItem;
}

const typeConfig = {
  story: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
  task: { icon: CheckSquare, color: 'text-primary', bg: 'bg-primary/10' },
  bug: { icon: Bug, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
  subtask: { icon: Layers, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/20' },
};

const priorityConfig: Record<string, { icon: typeof ArrowUp; color: string; double?: boolean }> = {
  highest: { icon: ArrowUp, color: 'text-red-600', double: true },
  high: { icon: ArrowUp, color: 'text-red-500' },
  medium: { icon: Minus, color: 'text-amber-500' },
  low: { icon: ArrowDown, color: 'text-blue-500' },
  lowest: { icon: ArrowDown, color: 'text-blue-400', double: true },
};

export function BoardCard({ item }: BoardCardProps) {
  const TypeIcon = typeConfig[item.type]?.icon || CheckSquare;
  const typeStyle = typeConfig[item.type] || typeConfig.task;
  const PriorityIcon = priorityConfig[item.priority]?.icon || Minus;
  const priorityStyle = priorityConfig[item.priority] || priorityConfig.medium;

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer">
      {/* Type & Key */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1 rounded', typeStyle.bg)}>
          <TypeIcon className={cn('w-3.5 h-3.5', typeStyle.color)} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{item.key}</span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-3">
        {item.title}
      </h4>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <div className="flex items-center" title={`Priority: ${item.priority}`}>
            {priorityStyle.double ? (
              <div className="flex flex-col -space-y-1.5">
                <PriorityIcon className={cn('w-3.5 h-3.5', priorityStyle.color)} />
                <PriorityIcon className={cn('w-3.5 h-3.5', priorityStyle.color)} />
              </div>
            ) : (
              <PriorityIcon className={cn('w-4 h-4', priorityStyle.color)} />
            )}
          </div>

          {/* Story Points */}
          {item.storyPoints && (
            <span className="flex items-center justify-center w-5 h-5 bg-muted rounded text-xs font-medium text-muted-foreground">
              {item.storyPoints}
            </span>
          )}
        </div>

        {/* Assignee */}
        {item.assignee ? (
          <UserAvatar name={item.assignee.name} avatarUrl={item.assignee.avatar} size="xs" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-muted border-2 border-dashed border-border" />
        )}
      </div>
    </div>
  );
}
