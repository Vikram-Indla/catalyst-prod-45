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
      {/* Sentence case header */}
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="w-3.5 h-3.5" />
        Description
      </label>
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.textContent || '')}
        data-placeholder="Click to add a description..."
        className={cn(
          "min-h-[80px] p-3 rounded-lg text-sm text-foreground leading-relaxed",
          "bg-muted/30 border border-transparent",
          "hover:bg-muted/50 hover:border-border",
          "focus:outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/10",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
          "transition-all cursor-text"
        )}
      >
        {value}
      </div>
    </div>
  );
}
