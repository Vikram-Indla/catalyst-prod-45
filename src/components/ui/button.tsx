/**
 * Button — Catalyst enterprise button.
 * Preserves asChild/Slot pattern + variant/size API.
 * Styled with ADS design tokens instead of Tailwind color utilities.
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import Spinner from "@atlaskit/spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "ghost" | "outline" | "danger" | "destructive" | "success" | "ai" | "link";
  size?: "xs" | "sm" | "default" | "lg" | "icon" | "icon-sm" | "icon-xs";
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_STYLES: Record<string, string> = {
  default: "bg-[var(--ds-background-brand-bold,#0C66E4)] text-white hover:bg-[var(--ds-background-brand-bold-hovered,#0055CC)]",
  primary: "bg-[var(--ds-background-brand-bold,#0C66E4)] text-white hover:bg-[var(--ds-background-brand-bold-hovered,#0055CC)]",
  secondary: "bg-[var(--ds-background-neutral,#F1F2F4)] text-[var(--ds-text,#172B4D)] border border-[var(--ds-border,#DFE1E6)] hover:bg-[var(--ds-background-neutral-hovered,#DCDFE4)]",
  ghost: "text-[var(--ds-text,#172B4D)] hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]",
  outline: "border border-[var(--ds-border,#DFE1E6)] bg-transparent text-[var(--ds-text,#172B4D)] hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]",
  danger: "bg-[var(--ds-background-danger-bold,#CA3521)] text-white hover:bg-[var(--ds-background-danger-bold-hovered,#AE2A19)]",
  destructive: "bg-[var(--ds-background-danger-bold,#CA3521)] text-white hover:bg-[var(--ds-background-danger-bold-hovered,#AE2A19)]",
  success: "bg-[var(--ds-background-success-bold,#1F845A)] text-white hover:bg-[var(--ds-background-success-bold-hovered,#216E4E)]",
  ai: "bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white hover:from-[#6d28d9] hover:to-[#7c3aed]",
  link: "text-[var(--ds-link,#0C66E4)] underline-offset-4 hover:underline p-0 h-auto",
};

const SIZE_STYLES: Record<string, string> = {
  xs: "h-7 px-2.5 text-xs rounded [&_svg]:size-3.5",
  sm: "h-8 px-3 text-sm rounded-md [&_svg]:size-4",
  default: "h-9 px-4 text-sm rounded-md [&_svg]:size-4",
  lg: "h-11 px-6 text-base rounded-lg [&_svg]:size-5",
  icon: "h-9 w-9 rounded-md [&_svg]:size-4",
  "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-4",
  "icon-xs": "h-7 w-7 rounded [&_svg]:size-3.5",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, loading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-border-focused,#388BFF)] focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          VARIANT_STYLES[variant] || VARIANT_STYLES.default,
          SIZE_STYLES[size] || SIZE_STYLES.default,
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Spinner size="small" appearance="invert" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button };
