import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * ⚠️ DEPRECATED — DO NOT USE FOR NEW CODE.
 *
 * Catalyst is migrating to Atlassian Design System. This component is
 * scheduled for deletion in Rung 3 of the Atlaskit migration (task #26).
 *
 * Migration target:
 *   import { Lozenge, StatusLozenge, LegacyBadge } from '@/components/ads';
 *
 *   • Status badges (todo / inProgress / done) → <StatusLozenge status="..."/>
 *     3-colour guardrail (CLAUDE.md §5). Enforced at the type level.
 *   • Generic badges → <Lozenge appearance="default|inprogress|success|moved|removed|new"/>
 *   • Drop-in replacement (variant-compatible) → <LegacyBadge variant="..."/>
 *     Maps all 25+ shadcn variants to Atlaskit appearances. Use this
 *     when an existing call site is too complex to refactor in a single
 *     pass — swap the import and ship.
 *
 * Catalyst V5 legacy variants kept only for compatibility during migration.
 * Status variants: draft, active, complete, approved, rejected, blocked
 * Test result variants: passed, failed, skipped, not-run
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        // Base variants
        default: "border-transparent bg-foreground text-background",
        secondary: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-transparent text-foreground",
        
        // Brand colors
        primary: "border-transparent bg-[#dbeafe] text-[var(--ds-text-brand,#2563eb)]",
        teal: "border-transparent bg-[#ccfbf1] text-[#0d9488]",
        purple: "border-transparent bg-[#ede9fe] text-[#7c3aed]",
        
        // Semantic - Status
        success: "border-transparent bg-[#d1fae5] text-[#059669]",
        warning: "border-transparent bg-[#fef3c7] text-[var(--ds-text-warning,#d97706)]",
        danger: "border-transparent bg-[#fee2e2] text-[var(--ds-text-danger,#dc2626)]",
        destructive: "border-transparent bg-[#fee2e2] text-[var(--ds-text-danger,#dc2626)]",
        info: "border-transparent bg-[#dbeafe] text-[var(--ds-text-brand,#2563eb)]",
        error: "border-transparent bg-[#fee2e2] text-[var(--ds-text-danger,#dc2626)]",
        critical: "border-transparent bg-[#fee2e2] text-[var(--ds-text-danger,#dc2626)]",
        muted: "border-transparent bg-[#f5f5f5] text-[#737373]",
        
        // Workflow status
        draft: "border-[#e5e5e5] bg-[#f5f5f5] text-[#737373]",
        active: "border-transparent bg-[#dbeafe] text-[var(--ds-text-brand,#2563eb)]",
        complete: "border-transparent bg-[#d1fae5] text-[#059669]",
        approved: "border-transparent bg-[#d1fae5] text-[#059669]",
        rejected: "border-transparent bg-[#fee2e2] text-[var(--ds-text-danger,#dc2626)]",
        blocked: "border-transparent bg-[#fef3c7] text-[var(--ds-text-warning,#d97706)]",
        ready: "border-transparent bg-[#ccfbf1] text-[#0d9488]",
        review: "border-transparent bg-[#dbeafe] text-[var(--ds-text-brand,#2563eb)]",
        deprecated: "border-transparent bg-[#e5e5e5] text-[#525252]",
        
        // Test result variants
        passed: "border-transparent bg-[#d1fae5] text-[#059669]",
        failed: "border-transparent bg-[#fee2e2] text-[var(--ds-text-danger,#dc2626)]",
        skipped: "border-transparent bg-[#f5f5f5] text-[#737373]",
        "not-run": "border-transparent bg-[#f5f5f5] text-[#a3a3a3]",
        
        // AI variant
        ai: "border-transparent bg-gradient-to-r from-[#ede9fe] to-[#e0e7ff] text-[#7c3aed]",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        default: "px-2.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
