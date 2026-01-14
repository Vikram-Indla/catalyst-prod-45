/**
 * Date Picker Cell - Inline date editor
 */

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

interface DatePickerCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePickerCell({ value, onChange, minDate, maxDate }: DatePickerCellProps) {
  const [open, setOpen] = useState(false);
  
  const date = value ? parseISO(value) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    onChange(selectedDate ? selectedDate.toISOString() : null);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 group text-left">
          {date ? (
            <>
              <CalendarIcon 
                className="h-3.5 w-3.5" 
                style={{ color: CATALYST_V5.slate[400] }} 
              />
              <span className="text-sm" style={{ color: CATALYST_V5.slate[700] }}>
                {format(date, 'MMM d')}
              </span>
              <X 
                className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500" 
                style={{ color: CATALYST_V5.slate[400] }}
                onClick={handleClear}
              />
            </>
          ) : (
            <span className="text-sm" style={{ color: CATALYST_V5.slate[400] }}>
              No date
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(d) => {
            if (minDate && d < minDate) return true;
            if (maxDate && d > maxDate) return true;
            return false;
          }}
          initialFocus
        />
        {date && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-7 text-xs"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear Date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
