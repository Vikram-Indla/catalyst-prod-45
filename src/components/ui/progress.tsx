/**
 * Progress — ADS-canonical progress bar.
 * Delegates to @atlaskit/progress-bar.
 */
import * as React from "react";
import AkProgressBar from "@atlaskit/progress-bar";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => (
    <div ref={ref} className={cn("w-full", className)} {...props}>
      <AkProgressBar value={value / max} />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress };
