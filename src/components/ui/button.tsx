import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * FIX D: Button Sizes + Pressed State
 * - Default height: 36px (h-9)
 * - Small height: 32px (h-8)
 * - Large height: 40px (h-10)
 * - Icon: 32px (h-8 w-8)
 * - Pressed state: active:scale-[0.98] + active:brightness-95
 */
const buttonVariants = cva(
  // Focus ring uses BLUE per design spec v2 (NOT gray/gold)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] dark:focus-visible:ring-[#60a5fa] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] active:brightness-95",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-white hover:bg-brand-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Outline uses semantic tokens
        outline: "border border-border bg-card text-foreground hover:bg-muted",
        // Secondary uses semantic tokens
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        // Ghost uses semantic tokens
        ghost: "text-foreground hover:bg-muted",
        link: "text-brand-primary underline-offset-4 hover:underline",
        gold: "bg-brand-primary text-white hover:bg-brand-primary/90",
        primary: "bg-brand-primary text-white hover:bg-brand-primary/90",
      },
      size: {
        // FIX D: Aligned to spec - default 36px, sm 32px, lg 40px, icon 32px
        default: "h-9 px-4 py-2",      // 36px
        sm: "h-8 rounded-md px-3",      // 32px
        lg: "h-10 rounded-md px-8",     // 40px
        icon: "h-8 w-8",                // 32px (was 36px)
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
