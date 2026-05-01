// =====================================================
// DEFECT FILTER DROPDOWN
// Searchable multi-select filter dropdown
// =====================================================

import { useState, useRef, useEffect } from 'react';
import { Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CATALYST_V5, DEFECT_SEVERITY_COLORS, DEFECT_STATUS_COLORS } from '@/lib/catalyst-colors';
import type { FilterType } from '@/types/defect.types';
import { STATUS_CONFIG, SEVERITY_CONFIG, PRIORITY_CONFIG } from '@/types/defect.types';

interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

interface DefectFilterDropdownProps {
  type: FilterType;
  selected: string[];
  options: FilterOption[];
  onChange: (values: string[]) => void;
  onClose: () => void;
  searchable?: boolean;
}

export function DefectFilterDropdown({
  type,
  selected,
  options,
  onChange,
  onClose,
  searchable = false,
}: DefectFilterDropdownProps) {
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const getColorDot = (option: FilterOption) => {
    if (type === 'severity' && DEFECT_SEVERITY_COLORS[option.value as keyof typeof DEFECT_SEVERITY_COLORS]) {
      return DEFECT_SEVERITY_COLORS[option.value as keyof typeof DEFECT_SEVERITY_COLORS].dot;
    }
    if (type === 'status' && DEFECT_STATUS_COLORS[option.value as keyof typeof DEFECT_STATUS_COLORS]) {
      return DEFECT_STATUS_COLORS[option.value as keyof typeof DEFECT_STATUS_COLORS].text;
    }
    return option.color;
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50"
    >
      {/* Search */}
      {searchable && (
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Options */}
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredOptions.length === 0 ? (
          <div className="py-4 text-center text-sm text-slate-500">
            No options found
          </div>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = selected.includes(option.value);
            const dotColor = getColorDot(option);

            return (
              <button
                key={option.value}
                onClick={() => toggleOption(option.value)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                  isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                )}
              >
                <Checkbox checked={isSelected} className="pointer-events-none" />
                {dotColor && (
                  <span 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: dotColor }}
                  />
                )}
                <span className={cn(
                  "flex-1 text-left",
                  isSelected && "font-medium"
                )}>
                  {option.label}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Clear/Apply footer */}
      {selected.length > 0 && (
        <div className="p-2 border-t border-slate-100">
          <button
            onClick={() => onChange([])}
            className="w-full text-xs text-slate-500 hover:text-slate-700 py-1"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}

// =====================================================
// PRESET OPTIONS
// =====================================================

export function getStatusOptions(): FilterOption[] {
  return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  }));
}

export function getSeverityOptions(): FilterOption[] {
  return Object.entries(SEVERITY_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  }));
}

export function getPriorityOptions(): FilterOption[] {
  return Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  }));
}

export function getSourceOptions(): FilterOption[] {
  return [
    { value: 'jira', label: 'Jira', color: 'var(--ds-text-brand, #2563EB)' },
    { value: 'native', label: 'Catalyst', color: 'var(--ds-text-subtlest, #64748b)' },
  ];
}
