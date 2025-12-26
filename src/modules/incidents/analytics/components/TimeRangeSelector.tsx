/**
 * Time Range Selector
 * Today | 24h | 7D | 30D | Custom
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { TimeRange } from '../types';
import { format } from 'date-fns';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange, customStart?: Date, customEnd?: Date) => void;
  customStart?: Date;
  customEnd?: Date;
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'custom', label: 'Custom' },
];

export function TimeRangeSelector({ value, onChange, customStart, customEnd }: TimeRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | undefined>(customStart);
  const [tempEnd, setTempEnd] = useState<Date | undefined>(customEnd);

  const handleRangeClick = (range: TimeRange) => {
    if (range === 'custom') {
      setIsOpen(true);
    } else {
      onChange(range);
    }
  };

  const handleCustomApply = () => {
    if (tempStart && tempEnd) {
      onChange('custom', tempStart, tempEnd);
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full md:w-auto overflow-x-auto">
      <div className="flex items-center gap-1 w-max pr-1">
        {RANGES.map((range) => (
          range.value === 'custom' ? (
            <Popover key={range.value} open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={value === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "h-8 text-xs",
                    value === 'custom' 
                      ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white" 
                      : "border-border"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {value === 'custom' && customStart && customEnd
                    ? `${format(customStart, 'MMM d')} - ${format(customEnd, 'MMM d')}`
                    : 'Custom'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="end">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Start Date</div>
                      <CalendarComponent
                        mode="single"
                        selected={tempStart}
                        onSelect={setTempStart}
                        disabled={(date) => date > new Date()}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">End Date</div>
                      <CalendarComponent
                        mode="single"
                        selected={tempEnd}
                        onSelect={setTempEnd}
                        disabled={(date) => date > new Date() || (tempStart && date < tempStart)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleCustomApply}
                      disabled={!tempStart || !tempEnd}
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              key={range.value}
              variant={value === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRangeClick(range.value)}
              className={cn(
                "h-8 text-xs",
                value === range.value 
                  ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white" 
                  : "border-border"
              )}
            >
              {range.label}
            </Button>
          )
        ))}
      </div>
    </div>
  );
}
