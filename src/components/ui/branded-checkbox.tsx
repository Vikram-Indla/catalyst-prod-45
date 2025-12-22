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
        "w-[18px] h-[18px] rounded flex items-center justify-center",
        "border-2 transition-all duration-150",
        checked
          ? "bg-[#C69C6D] border-[#C69C6D]"
          : "bg-transparent border-[#9CA3AF] dark:border-[#6B7280]",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && !checked && "hover:border-[#C69C6D]",
        className
      )}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </button>
  );
}
