/**
 * Form — thin wrapper preserving react-hook-form integration.
 * Uses ADS token styling instead of radix-ui/react-label.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

const Form = ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
  <form {...props}>{children}</form>
);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <Label ref={ref} className={cn("text-sm font-medium text-[var(--ds-text,#172B4D)]", className)} {...props} />
  )
);
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => <div ref={ref} {...props} />
);
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--ds-text-subtlest,#6B778C)]", className)} {...props} />
  )
);
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;
    return (
      <p ref={ref} className={cn("text-sm font-medium text-[var(--ds-text-danger,#AE2A19)]", className)} {...props}>
        {children}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

const FormField = ({ children, ...props }: { children: React.ReactNode; name?: string; control?: any; render?: any }) => (
  <>{children}</>
);

export { Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };
