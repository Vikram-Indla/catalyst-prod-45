/**
 * Hero Title Input - Per V4 Spec Section 4.2
 * Large, borderless input for task title
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export const TitleInput = forwardRef<HTMLInputElement, TitleInputProps>(
  ({ value, onChange, error, className }, ref) => {
    return (
      <div className={cn("space-y-1", className)}>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What needs to be done?"
          className={cn(
            "w-full h-auto py-2 px-0",
            "text-lg font-medium text-slate-900 dark:text-slate-100",
            "bg-transparent border-0 border-b-2",
            "outline-none transition-colors duration-150",
            "placeholder:text-slate-400 placeholder:font-normal",
            error
              ? "border-red-500 focus:border-red-500"
              : "border-slate-200 dark:border-slate-700 focus:border-blue-600"
          )}
          aria-label="Task title"
          aria-invalid={!!error}
          aria-describedby={error ? "title-error" : undefined}
        />
        {error && (
          <p id="title-error" className="text-xs text-red-500 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TitleInput.displayName = 'TitleInput';
