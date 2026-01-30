/**
 * Styled Date Picker - TaskBoardModal Style
 * Uses Radix Popover with position="popper" for proper anchoring
 */

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Colors from TaskBoardModal
const COLORS = {
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  accent: '#2563eb'
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface StyledDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function StyledDatePicker({ label, value, onChange, placeholder = 'Set date...' }: StyledDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  
  const selectedDate = value ? new Date(value) : null;

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }, [viewDate]);

  const handleNextMonth = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }, [viewDate]);

  const handleSelectDate = React.useCallback((day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate.toISOString().split('T')[0]);
    setOpen(false);
  }, [viewDate, onChange]);

  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  const handleQuickDate = React.useCallback((daysToAdd: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    onChange(date.toISOString().split('T')[0]);
    setOpen(false);
  }, [onChange]);

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    
    const days: React.ReactNode[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-9 h-9" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year;
      const isToday = today.getDate() === day && 
        today.getMonth() === month && 
        today.getFullYear() === year;
      
      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleSelectDate(day)}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg text-sm",
            "transition-colors duration-100",
            isSelected 
              ? "bg-blue-600 text-white font-semibold" 
              : isToday 
                ? "border border-blue-600 font-semibold text-slate-900" 
                : "text-slate-900 hover:bg-slate-100"
          )}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* LABEL */}
      <span 
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: COLORS.textLight }}
      >
        {label}
      </span>

      {/* RADIX POPOVER */}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 w-full",
              "bg-white border rounded-[10px] cursor-pointer",
              "transition-all duration-150 outline-none text-left",
              "hover:border-slate-300",
              "focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15",
              "data-[state=open]:border-blue-500 data-[state=open]:ring-[3px] data-[state=open]:ring-blue-500/15"
            )}
            style={{ borderColor: COLORS.borderLight }}
          >
            <Calendar size={18} className="text-slate-400 flex-shrink-0" />
            <span 
              className={cn(
                "flex-1 text-sm",
                selectedDate ? "text-slate-900" : "text-slate-400"
              )}
            >
              {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
            </span>
            {selectedDate && (
              <X 
                size={16} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer" 
                onClick={handleClear}
              />
            )}
            <ChevronDown 
              size={16} 
              className="text-slate-400 transition-transform duration-200 data-[state=open]:rotate-180" 
            />
          </button>
        </PopoverPrimitive.Trigger>

        {/* PORTAL + CONTENT with position="popper" */}
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="bottom"
            align="start"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={{ top: 8, right: 8, bottom: 68, left: 8 }}
            className={cn(
              "bg-white border rounded-xl shadow-xl p-4 w-[300px]",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
            style={{ 
              borderColor: COLORS.borderDefault,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
              zIndex: 'var(--z-modal-popover, 500)'
            }}
          >
            {/* MONTH NAVIGATION */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-[15px] font-semibold text-slate-900">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* DAY HEADERS */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div
                  key={day}
                  className="w-9 h-7 flex items-center justify-center text-xs font-semibold text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* CALENDAR GRID */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>

            {/* QUICK ACTIONS */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleQuickDate(0)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-[13px] font-medium text-slate-600 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(1)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-[13px] font-medium text-slate-600 transition-colors"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(7)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-[13px] font-medium text-slate-600 transition-colors"
              >
                Next Week
              </button>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
