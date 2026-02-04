// ═══════════════════════════════════════════════════════════════════════════════
// T10 STATUS FILTER DROPDOWN
// Single-select status filter
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { T10ListStatus } from '../../types';

interface T10StatusFilterProps {
  value: T10ListStatus | 'all';
  onChange: (status: T10ListStatus | 'all') => void;
}

const STATUS_OPTIONS: { value: T10ListStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Statuses', color: 'bg-slate-400' },
  { value: 'active', label: 'Active', color: 'bg-emerald-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-slate-400' },
  { value: 'archived', label: 'Archived', color: 'bg-amber-500' },
];

export function T10StatusFilter({ value, onChange }: T10StatusFilterProps) {
  const [open, setOpen] = useState(false);

  const selectStatus = (status: T10ListStatus | 'all') => {
    onChange(status);
    setOpen(false);
  };

  const hasFilter = value !== 'all';
  const selectedOption = STATUS_OPTIONS.find(o => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border rounded-lg transition-all ${
            hasFilter
              ? 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'
              : 'text-slate-600 bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
          }`}
        >
          <Clock size={14} />
          {hasFilter ? selectedOption?.label : 'Status'}
          <ChevronDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <div className="py-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => selectStatus(option.value)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${option.color}`} />
              <span className="flex-1 text-left text-sm text-slate-700">
                {option.label}
              </span>
              {value === option.value && (
                <Check size={16} className="text-blue-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
