import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CatalystButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export const CatalystButton = forwardRef<HTMLButtonElement, CatalystButtonProps>(
  ({ variant = "primary", loading, children, className, disabled, ...props }, ref) => {
    const isPrimary = variant === "primary";
    
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "w-full relative overflow-hidden transition-all duration-300 font-body py-4 font-semibold rounded-[10px] text-base border-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5",
          className
        )}
        style={{
          backgroundColor: isPrimary ? 'hsl(var(--brand-gold))' : 'var(--btn-secondary-bg)',
          color: isPrimary ? '#fff' : 'var(--btn-secondary-text)',
          borderColor: isPrimary ? undefined : 'var(--btn-secondary-border)',
          borderWidth: isPrimary ? undefined : '1px',
          borderStyle: isPrimary ? undefined : 'solid',
        }}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        ) : (
          children
        )}
      </button>
    );
  }
);

CatalystButton.displayName = "CatalystButton";
