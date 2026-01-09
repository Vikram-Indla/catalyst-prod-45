import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge Component - Catalyst V5 Token-Based Semantic Variants
 * All colors use CSS variables from index.css - NO hardcoded colors
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        // Default - uses semantic tokens
        default: "border-transparent bg-foreground text-background",
        // Secondary - subtle background
        secondary: "border-border bg-muted text-muted-foreground",
        // Destructive - danger semantic
        destructive: "border-[var(--sem-danger-border)] bg-[var(--sem-danger-bg)] text-[var(--sem-danger)]",
        // Outline - bordered style
        outline: "border-border bg-card text-foreground",
        // Success - uses V5 success tokens
        success: "border-[var(--sem-success-border)] bg-[var(--sem-success-bg)] text-[var(--sem-success)]",
        // Warning - uses V5 warning tokens (for BLOCKED only)
        warning: "border-[var(--sem-warning-border)] bg-[var(--sem-warning-bg)] text-[var(--sem-warning)]",
        // Error - uses V5 danger tokens
        error: "border-[var(--sem-danger-border)] bg-[var(--sem-danger-bg)] text-[var(--sem-danger)]",
        // Info - uses V5 info tokens
        info: "border-[var(--sem-info-border)] bg-[var(--sem-info-bg)] text-[var(--sem-info)]",
        // Critical - highest severity
        critical: "border-[var(--sem-critical-border)] bg-[var(--sem-critical-bg)] text-[var(--sem-critical)]",
        // Muted - neutral/low priority
        muted: "border-[var(--status-muted-border)] bg-[var(--sem-medium-bg)] text-[var(--sem-medium)]",
        // DRAFT - Neutral gray (NOT warning/danger!)
        draft: "border-[#e5e5e5] bg-[#f5f5f5] text-[#737373]",
        // Ready - Teal
        ready: "border-transparent bg-[#ccfbf1] text-[#0d9488]",
        // Approved - Green
        approved: "border-transparent bg-[#d1fae5] text-[#059669]",
        // Review - Blue
        review: "border-transparent bg-[#dbeafe] text-[#2563eb]",
        // Deprecated - Darker gray
        deprecated: "border-transparent bg-[#e5e5e5] text-[#525252]",
        // Blocked - Warning (ONLY for blocked status)
        blocked: "border-transparent bg-[#fef3c7] text-[#d97706]",
        // Failed - Danger red
        failed: "border-transparent bg-[#fee2e2] text-[#dc2626]",
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
