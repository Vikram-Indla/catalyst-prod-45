import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CatalystCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string | React.ReactNode;
}

export const CatalystCheckbox = forwardRef<HTMLInputElement, CatalystCheckboxProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <label className="flex items-start gap-2 cursor-pointer group">
        <div className="relative mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <div 
            className={cn(
              "w-4 h-4 rounded-sm border-2 flex items-center justify-center",
              "transition-all duration-150",
              // Catalyst V5: Visible border in both light and dark modes
              "border-[hsl(var(--border-default))] dark:border-[#7D7D7D]",
              "bg-transparent",
              // Checked state
              "peer-checked:bg-primary peer-checked:border-primary",
              // Focus state
              "peer-focus:ring-2 peer-focus:ring-primary/30 peer-focus:ring-offset-1 dark:peer-focus:ring-offset-[hsl(var(--background))]",
              // Hover state
              "group-hover:border-primary/70 dark:group-hover:border-[#7D7D7D]",
              className
            )}
          >
            <Check 
              className="w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" 
              strokeWidth={3}
            />
          </div>
        </div>
        {label && (
          <span className="text-[13px] leading-snug text-muted-foreground dark:text-[var(--ds-text-subtlest,#A1A1A1)]">
            {label}
          </span>
        )}
      </label>
    );
  }
);

CatalystCheckbox.displayName = "CatalystCheckbox";
