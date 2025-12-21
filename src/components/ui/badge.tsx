import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gray-900 text-gray-50 dark:bg-gray-50 dark:text-gray-900",
        secondary: "border-transparent bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
        destructive: "border-transparent bg-red-500 text-white",
        outline: "border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100",
        success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        error: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
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
