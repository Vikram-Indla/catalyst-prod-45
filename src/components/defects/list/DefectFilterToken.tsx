// =====================================================
// DEFECT FILTER TOKEN
// Individual filter chip with remove functionality
// =====================================================

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilterType } from '@/types/defect.types';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

interface DefectFilterTokenProps {
  type: FilterType;
  label: string;
  values: string[];
  onRemove: () => void;
  onEdit?: () => void;
}

const TYPE_LABELS: Record<FilterType, string> = {
  status: 'Status',
  severity: 'Severity',
  priority: 'Priority',
  assignee: 'Assignee',
  reporter: 'Reporter',
  component: 'Component',
  blocker: 'Blocker',
  regression: 'Regression',
};

export function DefectFilterToken({ 
  type, 
  label, 
  values, 
  onRemove, 
  onEdit 
}: DefectFilterTokenProps) {
  const displayValue = values.length > 2 
    ? `${values.slice(0, 2).join(', ')} +${values.length - 2}` 
    : values.join(', ');

  return (
    <button
      onClick={onEdit}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium",
        "bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors",
        "border border-slate-200"
      )}
    >
      <span className="text-slate-500">{TYPE_LABELS[type]}:</span>
      <span className="font-semibold">{displayValue}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 p-0.5 rounded hover:bg-slate-300 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </button>
  );
}
