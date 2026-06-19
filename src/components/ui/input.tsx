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
        data-voice-zone="true"
        type={type}
          className={cn(
            "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base text-foreground",
            "border-border/50",
            "dark:bg-transparent dark:border-gray-700 dark:text-white",
            "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground dark:placeholder:text-gray-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary",
            "dark:focus-visible:ring-blue-500 dark:focus-visible:border-blue-500",
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
