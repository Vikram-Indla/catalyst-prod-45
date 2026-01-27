/**
 * Due Date Picker - Per V4 Spec
 * Date picker with quick options (Today, Tomorrow, Next Week)
 */

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

interface DueDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const QUICK_OPTIONS = [
  { label: 'Today', getValue: () => new Date() },
  { label: 'Tomorrow', getValue: () => addDays(new Date(), 1) },
  { label: 'Next Week', getValue: () => startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 0 }) },
];

export function DueDatePicker({ value, onChange, className }: DueDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const displayValue = value ? format(new Date(value), 'MMM d, yyyy') : '';

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        Due Date
      </label>
      
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-[42px] flex items-center gap-2 px-3",
          "text-sm bg-white dark:bg-slate-900 border rounded-lg",
          "cursor-pointer transition-all",
          isOpen
            ? "border-blue-600 ring-2 ring-blue-600/10"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        )}
      >
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
        {displayValue ? (
          <span className="text-slate-900 dark:text-slate-100 flex-1 text-left">{displayValue}</span>
        ) : (
          <span className="text-slate-400 flex-1 text-left">Select date...</span>
        )}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={cn(
            "absolute top-full left-0 right-0 mt-1 z-[1000]",
            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg",
            "shadow-lg shadow-black/10 dark:shadow-black/30",
            "overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          )}
        >
          {/* Quick Options */}
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
            {QUICK_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleQuickSelect(option.getValue())}
                className={cn(
                  "w-full px-3 py-2 rounded-md text-left",
                  "text-sm font-medium text-slate-700 dark:text-slate-300",
                  "hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Native Date Input */}
          <div className="p-3">
            <input
              ref={inputRef}
              type="date"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2",
                "text-sm text-slate-900 dark:text-slate-100",
                "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg",
                "focus:border-blue-600 focus:outline-none transition-colors"
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
