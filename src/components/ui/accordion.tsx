/**
 * Accordion — plain HTML details/summary. No radix dependency.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const Accordion = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { type?: string; collapsible?: boolean }) => (
  <div className={cn("divide-y divide-[var(--ds-border,#DFE1E6)]", className)} {...props}>{children}</div>
);

const AccordionItem = React.forwardRef<HTMLDetailsElement, React.DetailsHTMLAttributes<HTMLDetailsElement> & { value?: string }>(
  ({ className, children, value, ...props }, ref) => (
    <details ref={ref} className={cn("group", className)} {...props}>{children}</details>
  )
);
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => (
    <summary ref={ref as any} className={cn("flex cursor-pointer items-center justify-between py-4 font-medium transition-all [&[open]>svg]:rotate-180", className)} {...props}>
      {children}
    </summary>
  )
);
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("overflow-hidden text-sm pb-4 pt-0", className)} {...props}>{children}</div>
  )
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
