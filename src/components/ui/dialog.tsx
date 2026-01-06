import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[250]",
      "bg-black/75 dark:bg-black/80",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Semantic size variants for Atlassian-like dialog sizing
const dialogContentVariants = cva(
  cn(
    "fixed left-[50%] top-[50%] z-[250] grid w-full translate-x-[-50%] translate-y-[-50%]",
    "gap-4 rounded-xl",
    // Light mode: white bg, subtle border
    "bg-background border border-border/60",
    // Dark mode: surface-0 elevation, ultra-subtle border, shadow for depth
    "dark:bg-[#1a1a1a] dark:border-white/[0.04] dark:shadow-2xl dark:shadow-black/40",
    "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
    "focus:outline-none"
  ),
  {
    variants: {
      size: {
        sm: "max-w-[384px] p-5",      // Small dialogs
        md: "max-w-lg p-6",            // Default
        lg: "max-w-[640px] p-6",       // Large forms
        xl: "max-w-[768px] p-6",       // Extra large
        full: "max-w-[90vw] max-h-[90vh] p-6", // Fullscreen-ish
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogContentVariants({ size }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close 
        className={cn(
          "absolute right-4 top-4 rounded-lg p-2",
          "transition-colors text-muted-foreground",
          "hover:bg-muted dark:hover:bg-white/[0.04]",
          // Focus ring uses BLUE per design spec v2
          "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-0",
          "disabled:pointer-events-none"
        )}
      >
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * DialogHeader — Ultra-subtle divider in dark mode
 */
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left pb-4",
      "border-b border-border/60 dark:border-white/[0.05]",
      className
    )} 
    {...props} 
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * DialogFooter — Surface lift + ultra-subtle divider
 */
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3 pt-4",
      "border-t border-border/60 dark:border-white/[0.05]",
      "bg-muted/30 dark:bg-white/[0.02] -mx-6 -mb-6 px-6 pb-6 rounded-b-xl",
      className
    )} 
    {...props} 
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description 
    ref={ref} 
    className={cn("text-sm text-muted-foreground", className)} 
    {...props} 
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
