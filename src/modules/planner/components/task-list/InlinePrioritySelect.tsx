import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { TaskPriority } from '../../types';
import { PRIORITY_CONFIG } from '../../types';

interface InlinePrioritySelectProps {
  value: TaskPriority | null;
  onChange: (priority: TaskPriority) => void;
}

const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

export function InlinePrioritySelect({ value, onChange }: InlinePrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentConfig = value ? PRIORITY_CONFIG[value] : null;

  const handleSelect = (priority: TaskPriority) => {
    onChange(priority);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors hover:bg-accent",
            currentConfig?.colorful ? "" : "bg-transparent"
          )}
          style={{
            backgroundColor: currentConfig?.colorful ? currentConfig.bgColor : undefined,
            color: currentConfig?.color,
            border: currentConfig?.colorful ? `1px solid ${currentConfig.color}30` : undefined,
          }}
        >
          {currentConfig && (
            <>
              <span className="text-[10px]">{currentConfig.emoji}</span>
              {currentConfig.label}
            </>
          )}
          {!currentConfig && <span className="text-muted-foreground">No Priority</span>}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-40 p-1 bg-popover" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="max-h-64 overflow-y-auto overscroll-contain space-y-0.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          {PRIORITIES.map((priority) => {
            const config = PRIORITY_CONFIG[priority];
            return (
              <button
                key={priority}
                onClick={() => handleSelect(priority)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors",
                  priority === value 
                    ? "bg-accent" 
                    : "hover:bg-accent"
                )}
              >
                <span className="text-sm">{config.emoji}</span>
                <span 
                  className="flex-1" 
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>
                {priority === value && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
