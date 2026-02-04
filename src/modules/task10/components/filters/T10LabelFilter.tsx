// ═══════════════════════════════════════════════════════════════════════════════
// T10 LABEL FILTER DROPDOWN
// Multi-select filter for labels
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Tag, ChevronDown, Check, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useT10Labels } from '../../hooks/useT10Labels';
import type { T10Label } from '../../types';

interface T10LabelFilterProps {
  selected: string[];
  onChange: (labels: string[]) => void;
}

export function T10LabelFilter({ selected, onChange }: T10LabelFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: labels = [] } = useT10Labels();

  const filteredLabels = labels.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleLabel = (labelId: string) => {
    if (selected.includes(labelId)) {
      onChange(selected.filter(id => id !== labelId));
    } else {
      onChange([...selected, labelId]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setOpen(false);
  };

  const selectedCount = selected.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border rounded-lg transition-all ${
            selectedCount > 0
              ? 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'
              : 'text-slate-600 bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
          }`}
        >
          <Tag size={14} />
          Label
          {selectedCount > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded-full">
              {selectedCount}
            </span>
          )}
          <ChevronDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b border-slate-100">
          <Input
            placeholder="Search labels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-2">
          {filteredLabels.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              No labels found
            </div>
          ) : (
            filteredLabels.map((label) => (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 text-left text-sm text-slate-700 truncate">
                  {label.name}
                </span>
                {selected.includes(label.id) && (
                  <Check size={16} className="text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
        {selectedCount > 0 && (
          <div className="p-2 border-t border-slate-100">
            <button
              onClick={clearAll}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md"
            >
              <X size={14} />
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
