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
        primary: "border-transparent bg-[var(--ds-background-information)] text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]",
        teal: "border-transparent bg-[var(--ds-background-success)] text-[var(--ds-background-success-bold)]",
        purple: "border-transparent bg-[var(--ds-background-discovery)] text-[var(--ds-text-discovery)]",
        
        // Semantic - Status
        success: "border-transparent bg-[var(--ds-background-success)] text-[var(--quality-high)]",
        warning: "border-transparent bg-[var(--ds-background-warning)] text-[var(--ds-text-warning)]",
        danger: "border-transparent bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)]",
        destructive: "border-transparent bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)]",
        info: "border-transparent bg-[var(--ds-background-information)] text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]",
        error: "border-transparent bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)]",
        critical: "border-transparent bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)]",
        muted: "border-transparent bg-[var(--ds-background-neutral)] text-[var(--ds-text-subtle)]",
        
        // Workflow status
        draft: "border-[var(--ds-border)] bg-[var(--ds-background-neutral)] text-[var(--ds-text-subtle)]",
        active: "border-transparent bg-[var(--ds-background-information)] text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]",
        complete: "border-transparent bg-[var(--ds-background-success)] text-[var(--quality-high)]",
        approved: "border-transparent bg-[var(--ds-background-success)] text-[var(--quality-high)]",
        rejected: "border-transparent bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)]",
        blocked: "border-transparent bg-[var(--ds-background-warning)] text-[var(--ds-text-warning)]",
        ready: "border-transparent bg-[var(--ds-background-success)] text-[var(--ds-background-success-bold)]",
        review: "border-transparent bg-[var(--ds-background-information)] text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]",
        deprecated: "border-transparent bg-[var(--ds-border)] text-[var(--ds-text-subtle)]",
        
        // Test result variants
        passed: "border-transparent bg-[var(--ds-background-success)] text-[var(--quality-high)]",
        failed: "border-transparent bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)]",
        skipped: "border-transparent bg-[var(--ds-background-neutral)] text-[var(--ds-text-subtle)]",
        "not-run": "border-transparent bg-[var(--ds-background-neutral)] text-[var(--ds-text-subtle)]",
        
        // AI variant
        ai: "border-transparent bg-gradient-to-r from-[var(--ds-background-discovery)] to-[var(--ds-background-discovery)] text-[var(--ds-text-discovery)]",
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
