import * as React from "react";
import { format, addMonths, subMonths, setMonth, setYear, getYear, getMonth } from "date-fns";
import { ChevronUp, ChevronDown, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CatalystDatePickerProps {
  value?: Date | string | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  triggerClassName?: string;
  dateFormat?: string;
  showClearButton?: boolean;
  showTodayButton?: boolean;
}

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function CatalystDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
  maxDate,
  className,
  triggerClassName,
  dateFormat = "dd/MM/yyyy",
  showClearButton = true,
  showTodayButton = true,
}: CatalystDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState<Date>(() => {
    if (value) {
      return value instanceof Date ? value : new Date(value);
    }
    return new Date();
  });

  // Parse value to Date
  const selectedDate = React.useMemo(() => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }, [value]);

  // Update viewDate when value changes
  React.useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  const handlePreviousMonth = () => {
    setViewDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => addMonths(prev, 1));
  };

  const handleMonthChange = (monthIndex: string) => {
    setViewDate(prev => setMonth(prev, parseInt(monthIndex)));
  };

  const handleYearChange = (year: string) => {
    setViewDate(prev => setYear(prev, parseInt(year)));
  };

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleToday = () => {
    const today = new Date();
    onChange(today);
    setViewDate(today);
    setOpen(false);
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = getYear(viewDate);
    const month = getMonth(viewDate);
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();
    
    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; isDisabled: boolean }[] = [];
    
    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: selectedDate ? date.toDateString() === selectedDate.toDateString() : false,
        isDisabled: isDateDisabled(date),
      });
    }
    
    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: selectedDate ? date.toDateString() === selectedDate.toDateString() : false,
        isDisabled: isDateDisabled(date),
      });
    }
    
    // Next month days (fill to complete 6 rows = 42 days for fixed height)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: selectedDate ? date.toDateString() === selectedDate.toDateString() : false,
        isDisabled: isDateDisabled(date),
      });
    }
    
    return days;
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const days = generateCalendarDays();
  
  // Generate year options (current year ± 10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !selectedDate && "text-muted-foreground",
            triggerClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, dateFormat) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)} align="start">
        <div className="p-3 bg-popover rounded-md border shadow-lg">
          {/* Header with month/year selector and navigation */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <Select value={String(getMonth(viewDate))} onValueChange={handleMonthChange}>
                <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-transparent hover:bg-accent px-2 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-[500]">
                  {MONTHS.map((month, index) => (
                    <SelectItem key={month} value={String(index)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(getYear(viewDate))} onValueChange={handleYearChange}>
                <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-transparent hover:bg-accent px-2 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-[500] max-h-[200px]">
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePreviousMonth}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextMonth}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_OF_WEEK.map((day, index) => (
              <div
                key={index}
                className="h-9 w-9 flex items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => (
              <button
                key={index}
                type="button"
                disabled={day.isDisabled}
                onClick={() => handleDateSelect(day.date)}
                className={cn(
                  "h-9 w-9 flex items-center justify-center text-sm rounded-md transition-colors",
                  "hover:bg-brand-gold/10 focus:outline-none focus:ring-2 focus:ring-brand-gold/50",
                  !day.isCurrentMonth && "text-muted-foreground opacity-50",
                  day.isToday && !day.isSelected && "border border-brand-gold text-brand-gold font-medium",
                  day.isSelected && "bg-brand-gold text-white hover:bg-brand-gold-hover font-medium",
                  day.isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
                )}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>

          {/* Footer with Clear and Today buttons */}
          {(showClearButton || showTodayButton) && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              {showClearButton ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-brand-gold hover:text-brand-gold-hover hover:bg-brand-gold/10 h-8 px-3"
                >
                  Clear
                </Button>
              ) : (
                <div />
              )}
              {showTodayButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="text-brand-gold hover:text-brand-gold-hover hover:bg-brand-gold/10 h-8 px-3"
                >
                  Today
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

CatalystDatePicker.displayName = "CatalystDatePicker";

export { CatalystDatePicker };
export type { CatalystDatePickerProps };
