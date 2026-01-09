import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface BrandedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function BrandedCheckbox({ checked, onChange, disabled = false, className }: BrandedCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0",
        "border-2 transition-all duration-200",
        // Catalyst V5: Use semantic tokens for dark mode compatibility
        checked
          ? "bg-primary border-primary"
          : "bg-transparent border-[hsl(var(--border-default))] dark:border-[rgba(255,255,255,0.35)]",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
        !disabled && !checked && "hover:border-primary dark:hover:border-[rgba(255,255,255,0.5)]",
        !disabled && "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 dark:focus:ring-offset-[hsl(var(--background))]",
        className
      )}
    >
      {checked && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
    </button>
  );
}
