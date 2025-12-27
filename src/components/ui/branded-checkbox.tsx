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
checked
          ? "bg-[#2563eb] border-[#2563eb]"
          : "bg-transparent border-[#C8CCD0] dark:border-[#6B7280]",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
        !disabled && !checked && "hover:border-[#2563eb]",
        !disabled && "focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:ring-offset-1",
        className
      )}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </button>
  );
}
