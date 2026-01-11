/**
 * WorkItemRow — Single row component for work items list
 * Features: Priority bar, checkbox, type icon, key, summary, status, points, avatar, date
 */

import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { WorkItemWithRelations, PRIORITY_CONFIG } from '@/types/work-items';
import { WorkItemTypeIcon } from './WorkItemTypeIcon';
import { WorkItemStatusPill } from './WorkItemStatusPill';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkItemRowProps {
  item: WorkItemWithRelations;
  isSubtask?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (id: string) => void;
  onQuickAction?: (id: string, action: string) => void;
}

export function WorkItemRow({
  item,
  isSubtask = false,
  isSelected = false,
  isFocused = false,
  onSelect,
  onClick,
  onQuickAction,
}: WorkItemRowProps) {
  const priorityConfig = PRIORITY_CONFIG[item.priority];
  const showPriorityBar = priorityConfig.showBorder;

  // Format due date
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return null;
      return format(date, 'MMM d');
    } catch {
      return null;
    }
  };

  // Get assignee initials
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dueDate = formatDueDate(item.due_date);

  return (
    <div
      className={cn(
        'group relative flex items-center h-14 px-4 border-b border-border-subtle transition-colors duration-[50ms]',
        'hover:bg-surface-2 cursor-pointer',
        isSelected && 'bg-brand-primary-light/30',
        isFocused && 'ring-2 ring-inset ring-brand-primary',
        isSubtask && 'pl-14 bg-surface-2/50'
      )}
      onClick={() => onClick?.(item.id)}
      role="row"
      aria-selected={isSelected}
      tabIndex={0}
    >
      {/* Priority Bar (left border for P1/P2) */}
      {showPriorityBar && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: priorityConfig.borderColor }}
          aria-label={`Priority: ${priorityConfig.label}`}
        />
      )}

      {/* Checkbox */}
      <div className="flex-shrink-0 mr-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect?.(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="border-border-strong"
          aria-label={`Select ${item.key}`}
        />
      </div>

      {/* Type Icon */}
      <div className="flex-shrink-0 mr-3">
        <WorkItemTypeIcon type={item.type} size="md" />
      </div>

      {/* Key Badge */}
      <button
        className="flex-shrink-0 mr-3 font-mono text-sm font-medium text-brand-primary hover:text-brand-primary-hover hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(item.id);
        }}
      >
        {item.key}
      </button>

      {/* Summary */}
      <div className="flex-1 min-w-0 mr-4">
        <span className="text-sm text-text-1 truncate block">
          {item.summary}
        </span>
      </div>

      {/* Status Pill */}
      <div className="flex-shrink-0 mr-4">
        <WorkItemStatusPill status={item.status} />
      </div>

      {/* Story Points */}
      {item.story_points && (
        <div className="flex-shrink-0 mr-4 w-8 text-center">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-3 text-xs font-medium text-text-2">
            {item.story_points}
          </span>
        </div>
      )}

      {/* Assignee Avatar */}
      <div className="flex-shrink-0 mr-4">
        {item.assignee ? (
          <Avatar className="w-6 h-6">
            <AvatarImage src={item.assignee.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-brand-primary-light text-brand-primary font-medium">
              {getInitials(item.assignee.full_name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-6 h-6 rounded-full bg-surface-3 border border-dashed border-border-default" />
        )}
      </div>

      {/* Due Date */}
      {dueDate && (
        <div className="flex-shrink-0 mr-4">
          <span className="text-xs text-text-3">{dueDate}</span>
        </div>
      )}

      {/* Release Badge */}
      {item.fixed_version && (
        <div className="flex-shrink-0 mr-4">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-3 text-text-2 border border-border-subtle">
            {item.fixed_version.name}
          </span>
        </div>
      )}

      {/* Quick Actions (visible on hover) */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[50ms]">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAction?.(item.id, 'menu');
          }}
        >
          <MoreHorizontal className="h-4 w-4 text-text-3" />
        </Button>
      </div>
    </div>
  );
}

export default WorkItemRow;
