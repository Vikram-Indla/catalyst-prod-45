// ============================================================
// TASK DESCRIPTION COMPONENT - WITH @MENTIONS SUPPORT
// Simple section with MentionTextarea for user tagging
// ============================================================

import { MentionTextarea } from '@/components/shared/MentionTextarea';

interface TaskDescriptionProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskDescription({ value, onChange }: TaskDescriptionProps) {
  return (
    <div className="space-y-3">
      {/* Description content - editable with @mentions */}
      <MentionTextarea
        value={value}
        onChange={onChange}
        placeholder="Add a description... (Type @ to mention someone)"
        minHeight="100px"
        className="border-0 bg-transparent focus:ring-0 focus:ring-offset-0 p-0 text-sm leading-relaxed resize-none"
      />
    </div>
  );
}
