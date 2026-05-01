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
      "border-2 border-[hsl(var(--border-default))] dark:border-[var(--ds-border-bold,var(--ds-border-bold, #454545))]",
      // Unchecked state - transparent background
      "data-[state=unchecked]:bg-transparent",
      // Checked state - BLUE primary (Catalyst V5 spec: var(--ds-text-brand, #2563eb) / var(--ds-text-brand, #3b82f6))
      "data-[state=checked]:bg-[hsl(217,91%,53%)] data-[state=checked]:text-white data-[state=checked]:border-[hsl(217,91%,53%)]",
      "data-[state=indeterminate]:bg-[hsl(217,91%,53%)] data-[state=indeterminate]:text-white data-[state=indeterminate]:border-[hsl(217,91%,53%)]",
      // Focus ring uses BLUE per Catalyst V5 spec
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--ds-text-brand, #3b82f6))] dark:focus-visible:ring-[var(--ds-text-brand,var(--ds-text-brand, #60a5fa))] focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Hover state for unchecked
      "data-[state=unchecked]:hover:border-[hsl(217,91%,53%)]/70 dark:data-[state=unchecked]:hover:border-[#7D7D7D]",
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
