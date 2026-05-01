import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground",
        "dark:bg-transparent dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand, #3b82f6)] dark:focus-visible:ring-[var(--ds-text-brand, #60a5fa)] focus-visible:border-[var(--ds-text-brand, #3b82f6)] dark:focus-visible:border-[var(--ds-text-brand, #60a5fa)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
