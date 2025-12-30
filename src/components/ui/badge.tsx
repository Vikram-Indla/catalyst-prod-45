import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        // Default - uses semantic tokens
        default: "border-transparent bg-foreground text-background",
        // Secondary - subtle background
        secondary: "border-border bg-muted text-muted-foreground",
        // Destructive - red for errors/danger
        destructive: "border-transparent bg-[#ef4444] text-white dark:bg-[#f87171]",
        // Outline - bordered style
        outline: "border-border bg-card text-foreground",
        // Success - TEAL per design system v2 (NOT green)
        success: "border-transparent bg-[rgba(13,148,136,0.1)] text-[#0d9488] dark:bg-[rgba(20,184,166,0.15)] dark:text-[#14b8a6]",
        // Warning - Amber
        warning: "border-transparent bg-[rgba(245,158,11,0.1)] text-[#b45309] dark:bg-[rgba(245,158,11,0.15)] dark:text-[#fbbf24]",
        // Error - Red
        error: "border-transparent bg-[rgba(239,68,68,0.1)] text-[#b91c1c] dark:bg-[rgba(239,68,68,0.15)] dark:text-[#f87171]",
        // Info - Blue
        info: "border-transparent bg-[rgba(59,130,246,0.1)] text-[#1d4ed8] dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
