// ============================================================
// ACTIVE FILTER CHIPS
// Display and manage active calendar filters
// ============================================================

import { X } from 'lucide-react';
import '../../styles/planner-calendar.css';

interface FilterChip {
  id: string;
  label: string;
  value: string;
  color?: string;
}

interface ActiveFilterChipsProps {
  filters: FilterChip[];
  onRemove: (filterId: string) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({ filters, onRemove, onClearAll }: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="planner-calendar-content">
      <div className="cal-filter-chips">
        {filters.map(filter => (
          <div key={filter.id} className="cal-filter-chip">
            <span>{filter.label}: </span>
            <span className="font-semibold">{filter.value}</span>
            <button 
              className="cal-filter-chip-remove"
              onClick={() => onRemove(filter.id)}
              aria-label={`Remove ${filter.label} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {filters.length > 1 && (
          <button 
            className="cal-filter-clear-all"
            onClick={onClearAll}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
