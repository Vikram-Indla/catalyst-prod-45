/**
 * AlertDialog — ADS-canonical confirmation dialog.
 * Plain HTML + ADS tokens. No radix dependency.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const AlertDialog = ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => <>{children}</>;
const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, ...props }, ref) => <>{children}</>
);
AlertDialogTrigger.displayName = "AlertDialogTrigger";
const AlertDialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AlertDialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("fixed inset-0 z-[250] bg-black/75", className)} {...props} />
  )
);
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="fixed inset-0 z-[250] flex items-center justify-center">
      <AlertDialogOverlay />
      <div ref={ref} className={cn("relative z-[251] w-full max-w-lg rounded-xl bg-[var(--ds-surface-overlay,#fff)] p-6 shadow-xl border border-[var(--ds-border,#DFE1E6)]", className)} {...props}>
        {children}
      </div>
    </div>
  )
);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-left", className)} {...props} />
);
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-row justify-end gap-2 mt-6", className)} {...props} />
);
const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-semibold text-[var(--ds-text,#172B4D)]", className)} {...props} />
  )
);
AlertDialogTitle.displayName = "AlertDialogTitle";
const AlertDialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--ds-text-subtle,#42526E)]", className)} {...props} />
  )
);
AlertDialogDescription.displayName = "AlertDialogDescription";
const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={cn("inline-flex h-9 items-center justify-center rounded-md bg-[var(--ds-background-danger-bold,#CA3521)] px-4 text-sm font-medium text-white hover:opacity-90", className)} {...props} />
  )
);
AlertDialogAction.displayName = "AlertDialogAction";
const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={cn("inline-flex h-9 items-center justify-center rounded-md border border-[var(--ds-border,#DFE1E6)] bg-transparent px-4 text-sm font-medium text-[var(--ds-text,#172B4D)] hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]", className)} {...props} />
  )
);
AlertDialogCancel.displayName = "AlertDialogCancel";

export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
