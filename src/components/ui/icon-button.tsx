import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "muted";
  size?: "sm" | "md" | "lg";
  tooltip?: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", disabled, children, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-7 w-7",
      md: "h-8 w-8",
      lg: "h-9 w-9",
    };

    const variantClasses = {
      default: "hover:bg-[var(--nav-hover-bg)] active:bg-[var(--nav-active-bg)]",
      ghost: "hover:bg-[var(--surface-3)] active:bg-[var(--nav-active-bg)]",
      muted: "hover:bg-[var(--surface-3)] text-[var(--icon-muted)]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-colors",
          "text-[var(--icon-default)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
          "disabled:pointer-events-none disabled:opacity-40",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export { IconButton };
