/**
 * Module 3B-1: Worker count adjustment control
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Minus, 
  Plus, 
  Users,
  Cpu
} from 'lucide-react';

interface WorkerCountControlProps {
  count: number;
  minCount?: number;
  maxCount?: number;
  onChange: (count: number) => void;
  disabled?: boolean;
  className?: string;
}

export function WorkerCountControl({
  count,
  minCount = 1,
  maxCount = 5,
  onChange,
  disabled = false,
  className,
}: WorkerCountControlProps) {
  const handleDecrement = () => {
    if (count > minCount) {
      onChange(count - 1);
    }
  };

  const handleIncrement = () => {
    if (count < maxCount) {
      onChange(count + 1);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          Worker Count
        </Label>
        <span className="text-sm text-muted-foreground">
          {count} / {maxCount}
        </span>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleDecrement}
          disabled={disabled || count <= minCount}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Slider
          value={[count]}
          min={minCount}
          max={maxCount}
          step={1}
          onValueChange={([value]) => onChange(value)}
          disabled={disabled}
          className="flex-1"
        />

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleIncrement}
          disabled={disabled || count >= maxCount}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Worker Icons */}
      <div className="flex items-center justify-center gap-1">
        {Array.from({ length: maxCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'p-1.5 rounded-md transition-all',
              i < count 
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted/30 text-muted-foreground/30'
            )}
          >
            <Cpu className="h-4 w-4" />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {count === 1 
          ? 'Sequential execution' 
          : `${count} tests will run in parallel`}
      </p>
    </div>
  );
}
