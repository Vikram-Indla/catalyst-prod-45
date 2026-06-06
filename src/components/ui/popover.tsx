/**
 * Popover — plain HTML positioned popover. No radix dependency.
 * Uses ADS tokens for styling.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const Popover = ({ children, open, onOpenChange, modal = false }: {
  children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; modal?: boolean;
}) => <>{children}</>;

const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, ...props }, ref) => <>{children}</>
);
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverAnchor = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => <div ref={ref} {...props}>{children}</div>
);
PopoverAnchor.displayName = "PopoverAnchor";

const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  align?: string; sideOffset?: number; side?: string;
}>(
  ({ className, children, align, sideOffset, side, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "z-50 w-72 rounded-md border border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-surface-overlay,#fff)] p-4 shadow-md outline-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
PopoverContent.displayName = "PopoverContent";

const PopoverClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => <button ref={ref} {...props}>{children}</button>
);
PopoverClose.displayName = "PopoverClose";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose };
