// ============================================================
// TASK DESCRIPTION COMPONENT - POLISHED
// Rich text description with hover/focus states
// ============================================================

import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDescriptionProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskDescription({ value, onChange }: TaskDescriptionProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        <FileText className="w-3.5 h-3.5" />
        Description
      </label>
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.textContent || '')}
        data-placeholder="Add a description..."
        className={cn(
          "min-h-[80px] p-3 rounded-lg text-sm text-gray-700 leading-relaxed",
          "bg-gray-50 border border-transparent",
          "hover:bg-white hover:border-gray-200",
          "focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400",
          "transition-all cursor-text"
        )}
      >
        {value}
      </div>
    </div>
  );
}
