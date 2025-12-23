import { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  required?: boolean;
  isValid?: boolean;
  showValidation?: boolean;
  counter?: {
    current: number;
    max: number;
    type?: 'char' | 'word';
  };
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  required = false,
  isValid = false,
  showValidation = true,
  counter,
  children,
  className
}: FormFieldProps) {
  const counterText = counter 
    ? `${counter.current} / ${counter.max}${counter.type === 'word' ? ' words' : ''}`
    : null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>
        <div className="flex items-center gap-2">
          {counterText && (
            <span className={cn(
              "text-[10px] tabular-nums",
              counter && counter.current > counter.max * 0.9
                ? "text-amber-500 dark:text-amber-400"
                : "text-gray-400 dark:text-gray-500"
            )}>
              {counterText}
            </span>
          )}
          {showValidation && isValid && (
            <Check className="w-3.5 h-3.5 text-[#5c7c5c]" />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
