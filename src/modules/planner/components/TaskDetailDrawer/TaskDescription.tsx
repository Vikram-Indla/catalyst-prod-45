// ============================================================
// TASK DESCRIPTION COMPONENT
// Inline editable rich text description
// ============================================================

import { FileText } from 'lucide-react';
import { InlineEditable } from './InlineEditable';
import { SectionHeader } from './SectionHeader';

interface TaskDescriptionProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskDescription({ value, onChange }: TaskDescriptionProps) {
  return (
    <div>
      <SectionHeader icon={FileText} title="Description" />
      <div className="mt-2">
        <InlineEditable
          value={value}
          onChange={onChange}
          placeholder="Add a description..."
          multiline
          className="text-sm text-foreground/80 leading-relaxed min-h-[60px]"
        />
      </div>
    </div>
  );
}
