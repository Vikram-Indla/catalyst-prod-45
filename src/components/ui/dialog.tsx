/**
 * Dialog — ADS-canonical modal dialog.
 * Plain HTML + ADS tokens. Preserves shadcn compound API.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import CrossIcon from "@atlaskit/icon/core/close";

const DialogContext = React.createContext<{ onClose?: () => void }>({});

const Dialog = ({ children, open, onOpenChange, modal = true }: {
  children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; modal?: boolean;
}) => {
  if (open === false) return null;
  return (
    <DialogContext.Provider value={{ onClose: () => onOpenChange?.(false) }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, ...props }, ref) => <>{children}</>
);
DialogTrigger.displayName = "DialogTrigger";
const DialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DialogClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, onClick, ...props }, ref) => {
    const { onClose } = React.useContext(DialogContext);
    return <button ref={ref} onClick={(e) => { onClick?.(e); onClose?.(); }} {...props}>{children}</button>;
  }
);
DialogClose.displayName = "DialogClose";

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("fixed inset-0 z-[250] bg-black/75", className)} {...props} />
  )
);
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { size?: string }>(
  ({ className, children, size, ...props }, ref) => {
    const { onClose } = React.useContext(DialogContext);
    const sizeClass = { sm: "max-w-[384px]", md: "max-w-lg", lg: "max-w-[640px]", xl: "max-w-[768px]", full: "max-w-[90vw]" }[size || "md"] || "max-w-lg";
    return (
      <>
        <DialogOverlay onClick={onClose} />
        <div className="fixed inset-0 z-[251] flex items-center justify-center pointer-events-none">
          <div ref={ref} className={cn("pointer-events-auto w-full rounded-xl bg-[var(--ds-surface-overlay,#fff)] p-6 shadow-xl border border-[var(--ds-border,#DFE1E6)]", sizeClass, className)} {...props}>
            {children}
            <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-[var(--ds-icon-subtle,#626F86)] hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]">
              <CrossIcon label="Close" />
            </button>
          </div>
        </div>
      </>
    );
  }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-left pb-4 border-b border-[var(--ds-border,#DFE1E6)]", className)} {...props} />
);
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-row items-center justify-end gap-3 pt-4 border-t border-[var(--ds-border,#DFE1E6)]", className)} {...props} />
);
const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-semibold text-[var(--ds-text,#172B4D)]", className)} {...props} />
  )
);
DialogTitle.displayName = "DialogTitle";
const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--ds-text-subtle,#42526E)]", className)} {...props} />
  )
);
DialogDescription.displayName = "DialogDescription";

export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
