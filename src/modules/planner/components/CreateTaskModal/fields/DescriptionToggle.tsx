/**
 * Collapsible Description Field - Per V4 Spec
 * Progressive disclosure: collapsed by default
 */

import { useState } from 'react';
import { ChevronDown, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DescriptionToggleProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DescriptionToggle({ value, onChange, className }: DescriptionToggleProps) {
  const [isExpanded, setIsExpanded] = useState(!!value);

  return (
    <div className={cn("space-y-2", className)}>
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 w-full",
            "text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
            "border border-dashed border-slate-200 dark:border-slate-700 rounded-lg",
            "hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50",
            "transition-colors"
          )}
        >
          <AlignLeft className="w-4 h-4" />
          <span>Add description</span>
        </button>
      ) : (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              if (!value) setIsExpanded(false);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
            Description
          </button>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Add more details about this task..."
            rows={3}
            className={cn(
              "w-full px-3 py-2.5",
              "text-sm text-slate-900 dark:text-slate-100",
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg",
              "placeholder:text-slate-400",
              "focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none",
              "resize-none transition-all"
            )}
            aria-label="Task description"
          />
        </div>
      )}
    </div>
  );
}
