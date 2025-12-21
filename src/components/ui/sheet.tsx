import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

// Side variants - Using semantic tokens for theme support
// DRAWER LAYOUT CONTRACT: left/right drawers use h-[100dvh] to guarantee full viewport height
const sheetSideVariants = cva(
  cn(
    "fixed z-[200] shadow-2xl transition ease-in-out",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:duration-200 data-[state=open]:duration-300",
    "focus:outline-none"
  ),
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-[100dvh] max-h-[100dvh] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right: "inset-y-0 right-0 h-[100dvh] max-h-[100dvh] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

// Width variants for right/left drawers - Atlassian semantic widths
const sheetWidthVariants = cva("", {
  variants: {
    width: {
      narrow: "w-[360px]",    // Detail panels, quick views
      medium: "w-[480px]",    // Form drawers
      wide: "w-[640px]",      // Complex forms, previews
      xl: "w-[800px]",        // Large content
      auto: "w-3/4 sm:max-w-sm", // Legacy default
    },
  },
  defaultVariants: {
    width: "auto",
  },
});

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetSideVariants>,
    VariantProps<typeof sheetWidthVariants> {
  hideClose?: boolean;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", width, className, children, hideClose = false, ...props }, ref) => {
    const isHorizontal = side === "left" || side === "right";
    
    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content 
          ref={ref} 
          className={cn(
            sheetSideVariants({ side }), 
            isHorizontal && sheetWidthVariants({ width }),
            // DRAWER LAYOUT CONTRACT: 
            // 1. flex-col + overflow-hidden ensures single scroll container pattern
            // 2. Explicit white/gray-900 ensures opaque panel in both modes
            // 3. Explicit text colors ensure readable text
            // 4. rounded-none ensures clean rectangle edges (no rounded corners)
            "flex flex-col overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-none",
            // Border styling
            isHorizontal ? "border-l border-gray-200 dark:border-gray-700" : "border-t border-gray-200 dark:border-gray-700",
            className
          )}
          {...props}
        >
          {children}
          {!hideClose && (
            <SheetPrimitive.Close className={cn(
              "absolute right-4 top-4 rounded-md p-1",
              "opacity-70 transition-opacity",
              "hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500",
              "focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
              "disabled:pointer-events-none",
              "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            )}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col gap-1 px-6 py-4 shrink-0",
      "bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700",
      className
    )} 
    {...props} 
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 px-6 py-4 mt-auto shrink-0",
      "bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700",
      className
    )} 
    {...props} 
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex-1 overflow-auto px-6 py-4",
      "bg-white dark:bg-gray-900",
      className
    )} 
    {...props} 
  />
);
SheetBody.displayName = "SheetBody";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-gray-900 dark:text-gray-100", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-gray-500 dark:text-gray-400", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
