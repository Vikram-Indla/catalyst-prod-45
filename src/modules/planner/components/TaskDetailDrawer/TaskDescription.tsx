// ============================================================
// TASK DESCRIPTION COMPONENT - MATCHES REFERENCE
// Simple section with icon + label, clean text area
// ============================================================

import { FileText } from 'lucide-react';

interface TaskDescriptionProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskDescription({ value, onChange }: TaskDescriptionProps) {
  return (
    <div className="space-y-3">
      {/* Description content - editable (no duplicate header) */}
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.textContent || '')}
        data-placeholder="Add a description..."
        className="min-h-[60px] text-sm text-foreground leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground cursor-text"
      >
        {value}
      </div>
    </div>
  );
}
