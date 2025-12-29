// src/components/ja/home/ModeTag.tsx
// Work item mode tag (Operations, Delivery, Planner)

import { cn } from '@/lib/utils';
import type { WorkItemMode } from './WorkGridRow';

interface ModeTagProps {
  mode: WorkItemMode;
  className?: string;
}

const modeStyles: Record<WorkItemMode, { bg: string; text: string; label: string }> = {
  Operations: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'Ops',
  },
  Delivery: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Del',
  },
  Planner: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    label: 'Plan',
  },
};

export function ModeTag({ mode, className }: ModeTagProps) {
  const style = modeStyles[mode];
  
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
        style.bg,
        style.text,
        className
      )}
      title={mode}
    >
      {style.label}
    </span>
  );
}
