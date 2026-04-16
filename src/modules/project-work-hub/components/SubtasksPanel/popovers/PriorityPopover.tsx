import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PriorityIndicator, normalisePriority } from '@/components/shared/PriorityIndicator';
import { Check } from 'lucide-react';

interface PriorityPopoverProps {
  priority: string;
  onChange: (priority: 'Critical' | 'High' | 'Medium' | 'Low') => void;
  children: React.ReactNode;
}

const OPTIONS: Array<{ value: 'Critical' | 'High' | 'Medium' | 'Low' }> = [
  { value: 'Critical' },
  { value: 'High' },
  { value: 'Medium' },
  { value: 'Low' },
];

export function PriorityPopover({ priority, onChange, children }: PriorityPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const current = normalisePriority(priority);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="sp-pop"
        style={{ width: 180, padding: 4 }}
        onClick={(e) => e.stopPropagation()}
      >
        {OPTIONS.map(({ value }) => {
          const active = normalisePriority(value) === current;
          return (
            <button
              key={value}
              type="button"
              className="sp-pop-row"
              onClick={() => {
                onChange(value);
                setOpen(false);
              }}
            >
              <PriorityIndicator priority={value} showLabel fontSize={13} />
              {active && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
