import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CatalystButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export const CatalystButton = forwardRef<HTMLButtonElement, CatalystButtonProps>(
  ({ variant = "primary", loading, children, className, disabled, ...props }, ref) => {
    const variants = {
      primary: "btn-primary",
      secondary: "btn-secondary",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(variants[variant], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

CatalystButton.displayName = "CatalystButton";
