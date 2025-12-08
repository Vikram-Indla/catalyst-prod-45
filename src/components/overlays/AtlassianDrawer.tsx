/**
 * Atlassian-aligned Drawer Component
 * Consistent drawer anatomy with semantic width tokens
 * Supports narrow/medium/wide sizes with proper focus management
 */

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Drawer = SheetPrimitive.Root;
const DrawerTrigger = SheetPrimitive.Trigger;
const DrawerPortal = SheetPrimitive.Portal;
const DrawerClose = SheetPrimitive.Close;

// Overlay with consistent backdrop
const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[200] bg-black/40',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DrawerOverlay.displayName = 'DrawerOverlay';

// Width variants following Atlassian patterns
type DrawerWidth = 'narrow' | 'medium' | 'wide' | 'xl' | 'auto';
type DrawerSide = 'left' | 'right';

const widthClasses: Record<DrawerWidth, string> = {
  narrow: 'w-[360px] max-w-[90vw]',   // Quick edits, filters
  medium: 'w-[480px] max-w-[90vw]',   // Detail panels
  wide: 'w-[640px] max-w-[90vw]',     // Complex forms
  xl: 'w-[800px] max-w-[90vw]',       // Large detail views
  auto: 'w-auto max-w-[90vw]',        // Content-driven
};

const sideClasses: Record<DrawerSide, string> = {
  right: 'right-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
  left: 'left-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
};

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  width?: DrawerWidth;
  side?: DrawerSide;
  hideClose?: boolean;
}

// Drawer content with proper anatomy
const DrawerContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  DrawerContentProps
>(({ className, children, width = 'medium', side = 'right', hideClose = false, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <SheetPrimitive.Content
      ref={ref}
      data-ui="Drawer"
      className={cn(
        'fixed top-0 bottom-0 z-[200]',
        widthClasses[width],
        sideClasses[side],
        'bg-card border-l border-border',
        'shadow-xl',
        'flex flex-col',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'duration-300 ease-in-out',
        className
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <SheetPrimitive.Close
          className={cn(
            'absolute right-4 top-4',
            'h-8 w-8 flex items-center justify-center rounded-md',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-accent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none'
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

// Drawer header
const DrawerHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col gap-1.5 px-5 pt-5 pb-4',
      'border-b border-border',
      'shrink-0',
      className
    )}
    {...props}
  />
));
DrawerHeader.displayName = 'DrawerHeader';

// Drawer title
const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold text-foreground leading-6',
      'pr-8', // Space for close button
      className
    )}
    {...props}
  />
));
DrawerTitle.displayName = 'DrawerTitle';

// Drawer description/subtitle
const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground leading-5', className)}
    {...props}
  />
));
DrawerDescription.displayName = 'DrawerDescription';

// Drawer body - scrollable content area
const DrawerBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex-1 overflow-y-auto px-5 py-4',
      className
    )}
    {...props}
  />
));
DrawerBody.displayName = 'DrawerBody';

// Drawer footer with action buttons
const DrawerFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-end gap-3 px-5 py-4',
      'border-t border-border bg-muted/30',
      'shrink-0',
      className
    )}
    {...props}
  />
));
DrawerFooter.displayName = 'DrawerFooter';

export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
  DrawerClose,
};
