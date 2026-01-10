import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Catalyst V5 Button Component
 * Variants: primary, secondary, ghost, danger, success, ai (gradient)
 * Sizes: xs (28px), sm (32px), default (36px), lg (44px)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary - Blue brand
        default: "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-sm hover:shadow-md",
        primary: "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-sm hover:shadow-md",
        
        // Secondary - Subtle background
        secondary: "bg-muted text-foreground border border-border hover:bg-muted/80",
        
        // Ghost - No background
        ghost: "text-foreground hover:bg-muted/60",
        
        // Outline - Bordered
        outline: "border border-border bg-transparent text-foreground hover:bg-muted",
        
        // Danger - Red
        danger: "bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-sm",
        destructive: "bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-sm",
        
        // Success - Teal
        success: "bg-[#0d9488] text-white hover:bg-[#0f766e] shadow-sm",
        
        // AI - Purple gradient
        ai: "bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white hover:from-[#6d28d9] hover:to-[#7c3aed] shadow-[0_4px_14px_-2px_rgba(124,58,237,0.3)]",
        
        // Link style
        link: "text-brand-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded [&_svg]:size-3.5",     // 28px
        sm: "h-8 px-3 text-sm rounded-md [&_svg]:size-4",       // 32px
        default: "h-9 px-4 text-sm rounded-md [&_svg]:size-4",  // 36px
        lg: "h-11 px-6 text-base rounded-lg [&_svg]:size-5",    // 44px
        icon: "h-9 w-9 rounded-md [&_svg]:size-4",              // 36px square
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-4",         // 32px square
        "icon-xs": "h-7 w-7 rounded [&_svg]:size-3.5",          // 28px square
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
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
