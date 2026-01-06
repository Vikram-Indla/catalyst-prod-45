import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-border/50 dark:border-border/30 bg-background px-3 py-2 text-base text-foreground",
          "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          // Focus ring uses BLUE per design spec v2
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] dark:focus-visible:ring-[#60a5fa] focus-visible:border-[#3b82f6] dark:focus-visible:border-[#60a5fa]",
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
