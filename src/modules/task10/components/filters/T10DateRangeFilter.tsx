// ═══════════════════════════════════════════════════════════════════════════════
// T10 DATE RANGE FILTER DROPDOWN
// Preset-based date range filter
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Calendar, ChevronDown, Check, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { T10DateRangePreset } from '../../types';

interface DateRangeValue {
  preset: T10DateRangePreset | null;
  start: string | null;
  end: string | null;
}

interface T10DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (preset: T10DateRangePreset | null, start?: string | null, end?: string | null) => void;
}

const DATE_PRESETS: { value: T10DateRangePreset; label: string; icon?: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This Week' },
  { value: 'next_week', label: 'Next Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'overdue', label: 'Overdue', icon: '⚠️' },
];

export function T10DateRangeFilter({ value, onChange }: T10DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const selectPreset = (preset: T10DateRangePreset) => {
    onChange(preset);
    setOpen(false);
  };

  const clearFilter = () => {
    onChange(null, null, null);
    setOpen(false);
  };

  const hasFilter = value.preset !== null;
  const selectedLabel = DATE_PRESETS.find(p => p.value === value.preset)?.label;

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
          <Calendar size={14} />
          {hasFilter ? selectedLabel : 'Date Range'}
          <ChevronDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <div className="py-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => selectPreset(preset.value)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              {preset.icon && (
                <span className="text-sm">{preset.icon}</span>
              )}
              <span className="flex-1 text-left text-sm text-slate-700">
                {preset.label}
              </span>
              {value.preset === preset.value && (
                <Check size={16} className="text-blue-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        {hasFilter && (
          <div className="p-2 border-t border-slate-100">
            <button
              onClick={clearFilter}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md"
            >
              <X size={14} />
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
