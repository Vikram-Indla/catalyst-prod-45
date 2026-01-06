import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input Component — Catalyst V5 No-Drift
 * 
 * DARK MODE:
 * - bg: --bg-3
 * - border: --border-subtle
 * - focus ring: --focus-ring (brand gold)
 * - placeholder: --fg-3
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base text-foreground",
          // Light mode
          "border-border/50",
          // Dark mode: token-driven
          "dark:bg-[var(--bg-3)] dark:border-[var(--border-subtle)] dark:text-[var(--fg-1)]",
          "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Placeholder
          "placeholder:text-muted-foreground dark:placeholder:text-[var(--fg-3)]",
          // Focus ring: brand colors
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary",
          "dark:focus-visible:ring-[var(--focus-ring)] dark:focus-visible:border-brand-primary",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
