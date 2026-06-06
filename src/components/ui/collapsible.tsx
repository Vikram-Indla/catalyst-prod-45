/**
 * Collapsible — plain HTML. No radix dependency.
 */
import * as React from "react";

const Collapsible = ({ children, open, onOpenChange, ...props }: {
  children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; className?: string; defaultOpen?: boolean;
}) => <div {...props}>{children}</div>;

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, ...props }, ref) => <>{children}</>
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => <div ref={ref} {...props}>{children}</div>
);
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
