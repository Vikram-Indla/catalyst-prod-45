import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineDatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

export function InlineDatePicker({ value, onChange }: InlineDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value ? format(new Date(value), 'MM/dd/yyyy') : '');

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date.toISOString().split('T')[0]);
      setInputValue(format(date, 'MM/dd/yyyy'));
    } else {
      onChange(null);
      setInputValue('');
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Try to parse the date
    const parsed = new Date(e.target.value);
    if (!isNaN(parsed.getTime())) {
      onChange(parsed.toISOString().split('T')[0]);
    }
  };

  const selectedDate = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="flex items-center gap-1 text-[13px] text-[#172B4D] hover:bg-[#F4F5F7] rounded px-1 py-0.5 -mx-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4C9AFF] focus:ring-offset-1 min-w-[100px]">
          {value ? (
            <>
              <CalendarIcon className="h-3.5 w-3.5 text-[#6B778C]" />
              <span>{format(new Date(value), 'MMM d, yyyy')}</span>
            </>
          ) : (
            <span className="text-[#6B778C]">-</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 bg-white border border-[#DFE1E6] shadow-lg rounded-[3px]">
        <div className="p-2 border-b border-[#DFE1E6]">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="MM/DD/YYYY"
            className="h-8 text-[13px] border-[#DFE1E6] rounded-[3px] focus:border-[#4C9AFF]"
          />
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          className="rounded-[3px]"
          classNames={{
            day_selected: "bg-[#0052CC] text-white hover:bg-[#0052CC] hover:text-white focus:bg-[#0052CC] focus:text-white",
            day_today: "bg-[#DEEBFF] text-[#0052CC]",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
