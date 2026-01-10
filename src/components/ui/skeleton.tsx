import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Catalyst V5 Skeleton Component
 * Variants: text, avatar, card, rectangle
 */
const skeletonVariants = cva(
  "animate-pulse rounded-md bg-muted",
  {
    variants: {
      variant: {
        text: "h-4 w-full rounded",
        avatar: "rounded-full",
        card: "rounded-lg",
        rectangle: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "rectangle",
    },
  }
);

export interface SkeletonProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  shimmer?: boolean;
}

function Skeleton({ className, variant, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        skeletonVariants({ variant }),
        shimmer && "relative overflow-hidden after:absolute after:inset-0 after:translate-x-[-100%] after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

// Preset skeleton components
const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        variant="text" 
        className={cn("h-4", i === lines - 1 && "w-3/4")} 
      />
    ))}
  </div>
);

const SkeletonAvatar = ({ size = "default", className }: { size?: "xs" | "sm" | "default" | "lg" | "xl"; className?: string }) => {
  const sizeClass = {
    xs: "h-6 w-6",
    sm: "h-7 w-7",
    default: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  }[size];
  
  return <Skeleton variant="avatar" className={cn(sizeClass, className)} />;
};

const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("p-4 space-y-4", className)}>
    <div className="flex items-center space-x-3">
      <SkeletonAvatar />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard, skeletonVariants };
