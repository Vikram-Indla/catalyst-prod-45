import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface InlineDatePickerProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  isOverdue?: boolean;
  placeholder?: string;
}

export function InlineDatePicker({ 
  value, 
  onChange, 
  isOverdue = false,
  placeholder = 'Set date' 
}: InlineDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const date = value ? new Date(value) : undefined;
  const today = new Date();
  const daysUntilDue = date ? differenceInDays(date, today) : null;

  const getDateStatus = (): 'overdue' | 'urgent' | 'safe' | null => {
    if (daysUntilDue === null) return null;
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 2) return 'urgent';
    return 'safe';
  };

  const status = getDateStatus();

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      onChange(newDate.toISOString().split('T')[0]);
    } else {
      onChange(null);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors hover:bg-accent",
            !date && "text-muted-foreground",
            status === 'overdue' && "bg-destructive/10 text-destructive hover:bg-destructive/20",
            status === 'urgent' && "bg-warning/10 text-warning hover:bg-warning/20",
            status === 'safe' && "text-foreground/70"
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          {date ? (
            <>
              {format(date, 'MMM d')}
              {status === 'overdue' && ' ⚠'}
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-popover" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
        {date && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={handleClear}
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
