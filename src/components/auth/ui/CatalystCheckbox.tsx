import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CatalystCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string | React.ReactNode;
}

export const CatalystCheckbox = forwardRef<HTMLInputElement, CatalystCheckboxProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <label className="flex items-start gap-2 cursor-pointer">
        <div className="relative mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <div 
            className={cn(
              "w-4 h-4 rounded-sm border-2",
              "transition-all duration-150",
              "peer-checked:bg-brand-gold peer-checked:border-brand-gold",
              "peer-focus:ring-2 peer-focus:ring-brand-gold/20",
              className
            )}
            style={{ 
              borderColor: 'var(--input-border)',
              backgroundColor: 'var(--input-bg)'
            }}
          >
            <Check 
              className="w-3 h-3 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" 
              strokeWidth={3}
            />
          </div>
        </div>
        {label && (
          <span className="text-[13px] leading-snug" style={{ color: 'var(--text-2)' }}>
            {label}
          </span>
        )}
      </label>
    );
  }
);

CatalystCheckbox.displayName = "CatalystCheckbox";
