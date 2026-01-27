/**
 * Priority Select - Per V4 Spec
 * Native priority dropdown with color indicators
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITIES, type Priority } from '../types';
import type { TaskPriority } from '../../../types';

interface PrioritySelectProps {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
  className?: string;
}

export function PrioritySelect({ value, onChange, className }: PrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selected = PRIORITIES.find(p => p.value === value);

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

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (priority: Priority) => {
    onChange(priority.value);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        Priority
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
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selected ? (
          <>
            <span 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
              style={{ backgroundColor: selected.color }}
            />
            <span className="text-slate-900 dark:text-slate-100 flex-1 text-left">{selected.label}</span>
          </>
        ) : (
          <span className="text-slate-400 flex-1 text-left">Select priority...</span>
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
          role="listbox"
        >
          <div className="p-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleSelect(p)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md",
                  "text-left transition-colors",
                  p.value === value
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                role="option"
                aria-selected={p.value === value}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 flex-1">
                  {p.label}
                </span>
                {p.value === value && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
