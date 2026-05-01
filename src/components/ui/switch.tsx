import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Focus ring uses BLUE per design spec v2
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#3b82f6)] dark:focus-visible:ring-[var(--ds-text-brand,#60a5fa)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // ON state: GREEN (var(--ds-text-success, #16A34A)), OFF state: grey (#D4D4D8)
      "data-[state=checked]:bg-[var(--ds-text-success,#16A34A)] data-[state=checked]:border-[var(--ds-text-success,#16A34A)] data-[state=unchecked]:bg-[#D4D4D8] data-[state=unchecked]:border-[#D4D4D8]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 border border-border/50 dark:border-border/30",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
