import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      data-voice-zone="true"
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-transparent bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground",
        "dark:bg-transparent dark:border-transparent dark:text-white dark:placeholder:text-gray-500",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ds-text-brand)] dark:focus-visible:ring-[var(--ds-text-brand)] focus-visible:border-transparent dark:focus-visible:border-transparent",
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
