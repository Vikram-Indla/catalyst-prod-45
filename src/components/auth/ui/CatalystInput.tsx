import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CatalystInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const CatalystInput = forwardRef<HTMLInputElement, CatalystInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block mb-1.5 font-body text-sm font-medium" style={{ color: 'var(--text-1)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full transition-all outline-none font-body text-base py-3.5 px-4 rounded-[10px] border-2 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10",
            error && "border-destructive",
            className
          )}
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: error ? 'hsl(var(--destructive))' : 'var(--input-border)',
            color: 'var(--input-text)',
          }}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

CatalystInput.displayName = "CatalystInput";
