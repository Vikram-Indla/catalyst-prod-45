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
          <label className="label-atlassian">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            "input-atlassian",
            error && "border-error",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-error">{error}</p>
        )}
      </div>
    );
  }
);

CatalystInput.displayName = "CatalystInput";
