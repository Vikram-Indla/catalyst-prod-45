import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Catalyst V5 Progress Component
 * Variants: primary, success, warning, danger, teal
 * Sizes: sm (4px), default (6px), lg (8px)
 */
const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-[var(--progress-track)]",
  {
    variants: {
      size: {
        sm: "h-1",      // 4px
        default: "h-1.5", // 6px
        lg: "h-2",      // 8px
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const indicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        primary: "bg-[var(--ds-text-brand, #2563eb)]",
        success: "bg-[#0d9488]",
        warning: "bg-[var(--ds-text-warning, #d97706)]",
        danger: "bg-[var(--ds-text-danger, #dc2626)]",
        teal: "bg-[#0d9488]",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof indicatorVariants> {
  animate?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size, variant, animate = true, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(progressVariants({ size }), className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        indicatorVariants({ variant }),
        animate && "animate-progress-fill"
      )}
      style={{ 
        transform: `translateX(-${100 - (value || 0)}%)`,
        "--progress-value": `${value || 0}%`,
      } as React.CSSProperties}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

// Stacked Progress Bar
interface StackedProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  segments: Array<{
    value: number;
    variant?: "primary" | "success" | "warning" | "danger" | "teal";
    label?: string;
  }>;
  size?: "sm" | "default" | "lg";
}

const StackedProgress = React.forwardRef<HTMLDivElement, StackedProgressProps>(
  ({ className, segments, size = "default", ...props }, ref) => {
    const total = segments.reduce((acc, seg) => acc + seg.value, 0);
    
    const sizeClass = {
      sm: "h-1",
      default: "h-1.5",
      lg: "h-2",
    }[size];

    return (
      <div 
        ref={ref} 
        className={cn("relative w-full overflow-hidden rounded-full bg-[var(--progress-track)] flex", sizeClass, className)}
        {...props}
      >
        {segments.map((segment, index) => {
          const percentage = total > 0 ? (segment.value / total) * 100 : 0;
          return (
            <div
              key={index}
              className={cn(
                "h-full transition-all duration-500",
                indicatorVariants({ variant: segment.variant || "primary" })
              )}
              style={{ width: `${percentage}%` }}
              title={segment.label || `${segment.value}`}
            />
          );
        })}
      </div>
    );
  }
);
StackedProgress.displayName = "StackedProgress";

export { Progress, StackedProgress, progressVariants };
