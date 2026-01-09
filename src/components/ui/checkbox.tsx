import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm ring-offset-background",
      // Catalyst V5: Visible border in both light and dark modes
      "border-2 border-[hsl(var(--border-default))] dark:border-[rgba(255,255,255,0.25)]",
      // Unchecked state - transparent background
      "data-[state=unchecked]:bg-transparent",
      // Checked state - primary blue with white check
      "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
      "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary",
      // Focus ring uses BLUE per Catalyst V5 spec
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] dark:focus-visible:ring-[#60a5fa] focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Hover state for unchecked
      "data-[state=unchecked]:hover:border-primary/70 dark:data-[state=unchecked]:hover:border-[rgba(255,255,255,0.4)]",
      "transition-colors duration-150",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
