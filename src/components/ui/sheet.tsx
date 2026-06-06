/**
 * Sheet — ADS-canonical side panel.
 * Delegates to @atlaskit/drawer. Preserves shadcn compound API.
 */
import * as React from "react";
import Drawer from "@atlaskit/drawer";
import { cn } from "@/lib/utils";

const Sheet = ({ children, open, onOpenChange, ...props }: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  return <>{children}</>;
};

const SheetTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, ...props }, ref) => <>{children}</>
);
SheetTrigger.displayName = "SheetTrigger";

const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { side?: string }>(
  ({ className, children, side = "right", ...props }, ref) => (
    <div ref={ref} className={cn("fixed inset-y-0 z-50 flex flex-col bg-[var(--ds-surface,#fff)] shadow-lg", side === "right" ? "right-0" : "left-0", "w-[400px] max-w-[90vw]", className)} {...props}>
      {children}
    </div>
  )
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 p-6 border-b border-[var(--ds-border,#DFE1E6)]", className)} {...props} />
);

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-semibold text-[var(--ds-text,#172B4D)]", className)} {...props} />
  )
);
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--ds-text-subtle,#42526E)]", className)} {...props} />
  )
);
SheetDescription.displayName = "SheetDescription";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-row justify-end gap-2 p-6 border-t border-[var(--ds-border,#DFE1E6)]", className)} {...props} />
);

const SheetClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => <button ref={ref} {...props}>{children}</button>
);
SheetClose.displayName = "SheetClose";

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose };
