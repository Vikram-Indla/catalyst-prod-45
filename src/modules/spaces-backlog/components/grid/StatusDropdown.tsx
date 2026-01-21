/**
 * Status Dropdown — Inline status editor
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import { WorkItemStatus, STATUS_CONFIG } from '../../types';

interface StatusDropdownProps {
  value: WorkItemStatus;
  onChange: (status: WorkItemStatus) => void;
}

export function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const config = STATUS_CONFIG[value];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors",
          config.bgColor,
          config.textColor
        )}
      >
        <span>{config.label}</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-30">
          {(['backlog', 'todo', 'in_progress', 'review', 'done', 'blocked'] as WorkItemStatus[]).map(status => {
            const statusConfig = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(status);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700",
                  value === status && "bg-slate-50 dark:bg-slate-700"
                )}
              >
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", statusConfig.bgColor, statusConfig.textColor)}>
                  {statusConfig.label}
                </span>
                {value === status && <Check className="w-3 h-3 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
