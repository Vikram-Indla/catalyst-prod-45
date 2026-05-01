/**
 * PriorityDropdown - Modal-style priority picker with colored dots
 * Extracted from TaskListRowV3 for modularity
 */

import { useState, memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PRIORITY_CONFIG } from '../../types';
import type { TaskListTask } from '../../hooks/useTaskList';
import type { TaskPriority } from '../../types';

// Priority dot colors (spec A2)
const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
  critical: 'var(--ds-text-danger, #dc2626)', // red-600
  high: '#f97316',     // orange-500
  medium: '#eab308',   // yellow-500 (NOT green)
  low: 'var(--ds-text-subtlest, #94a3b8)',      // gray-400
};

export { PRIORITY_DOT_COLORS };

export interface PriorityDropdownProps {
  task: TaskListTask;
  width: number | string;
  onUpdate: (taskId: string, field: string, value: any) => void;
}

export const PriorityDropdown = memo(function PriorityDropdown({ task, width, onUpdate }: PriorityDropdownProps) {
  const [open, setOpen] = useState(false);
  const currentConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer bg-transparent border-0 hover:bg-muted/50 transition-colors">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: PRIORITY_DOT_COLORS[task.priority] }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--ds-text-subtle, #334155)' }}>{currentConfig.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5 z-[500] bg-popover border border-border shadow-lg" align="start">
          {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => {
            const config = PRIORITY_CONFIG[priority];
            const isSelected = priority === task.priority;
            return (
              <button
                key={priority}
                onClick={() => { onUpdate(task.id, 'priority', priority); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isSelected ? "bg-muted font-semibold" : "hover:bg-muted/50"
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_DOT_COLORS[priority] }} />
                <span>{config.label}</span>
                {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </td>
  );
});
