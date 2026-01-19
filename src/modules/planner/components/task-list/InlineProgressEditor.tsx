import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

interface InlineProgressEditorProps {
  value: number;
  onChange: (value: number) => void;
  workstreamColor?: string;
}

export function InlineProgressEditor({ value, onChange, workstreamColor }: InlineProgressEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const getProgressColor = (val: number) => {
    if (workstreamColor) return workstreamColor;
    if (val === 0) return 'hsl(var(--muted))';
    if (val < 30) return 'hsl(var(--destructive))';
    if (val < 70) return 'hsl(var(--warning))';
    if (val < 100) return 'hsl(var(--primary))';
    return 'hsl(var(--success))';
  };

  const handleChange = (val: number) => {
    setLocalValue(val);
  };

  const handleCommit = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
    setIsOpen(false);
  };

  const handleQuickSet = (val: number) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) setLocalValue(value);
    }}>
      <PopoverTrigger asChild>
        <button 
          className="flex items-center gap-2 w-full hover:bg-accent rounded-md p-1 -m-1 transition-colors group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
            <div
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${value}%`,
                backgroundColor: getProgressColor(value)
              }}
            />
          </div>
          <span className={cn(
            "text-xs font-semibold min-w-[32px] text-right",
            value === 100 ? "text-success" : "text-muted-foreground"
          )}>
            {value}%
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-3 bg-popover" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-semibold text-foreground">{localValue}%</span>
          </div>
          <Slider
            value={[localValue]}
            onValueChange={([val]) => handleChange(val)}
            onValueCommit={() => handleCommit()}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex gap-1">
            {[0, 25, 50, 75, 100].map((val) => (
              <button
                key={val}
                onClick={() => handleQuickSet(val)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium rounded transition-colors",
                  value === val
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
