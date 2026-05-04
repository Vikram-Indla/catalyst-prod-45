import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Catalyst Design System — Button
 *
 * Mirrors the Atlaskit Button API:
 *   - appearance: "default" | "primary" | "subtle" | "subtle-link" | "link" | "warning" | "danger" | "discovery"
 *   - spacing: "default" | "compact" | "none"
 *   - iconBefore, iconAfter  (instead of leftIcon/rightIcon)
 *   - isDisabled, isLoading, isSelected, shouldFitContainer
 *
 * Keeps `asChild` for Radix Slot composition (not in Atlaskit but widely used in Catalyst).
 */

const buttonStyles = cva(
  [
    "inline-flex items-center justify-center gap-[var(--ds-space-100)]",
    "font-[var(--ds-font-family-body)] font-[number:var(--ds-font-weight-medium)]",
    "rounded-[var(--ds-radius-200)]",
    "transition-all duration-[var(--ds-motion-duration-small)] ease-[var(--ds-motion-ease-out)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-border-focused)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-elevation-surface)]",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "whitespace-nowrap",
  ],
  {
    variants: {
      appearance: {
        default:
          "bg-[var(--ds-color-background-neutral)] text-[var(--ds-color-text)] hover:bg-[var(--ds-color-background-neutral-hovered)] active:bg-[var(--ds-color-background-neutral-pressed)]",
        primary:
          "bg-[var(--ds-color-background-accent-blue-bolder)] text-[var(--ds-color-text-inverse)] hover:brightness-110 active:brightness-95 shadow-[var(--ds-elevation-shadow-raised)]",
        subtle:
          "bg-transparent text-[var(--ds-color-text)] hover:bg-[var(--ds-color-background-neutral-subtle-hovered)] active:bg-[var(--ds-color-background-neutral-subtle-pressed)]",
        "subtle-link":
          "bg-transparent text-[var(--ds-color-link)] hover:bg-[var(--ds-color-background-neutral-subtle-hovered)] hover:underline",
        link:
          "bg-transparent text-[var(--ds-color-link)] hover:text-[var(--ds-color-link-hovered)] hover:underline p-0 h-auto shadow-none active:scale-100",
        warning:
          "bg-[var(--ds-color-background-warning-bold)] text-[var(--ds-color-text-inverse)] hover:brightness-110 active:brightness-95 shadow-[var(--ds-elevation-shadow-raised)]",
        danger:
          "bg-[var(--ds-color-background-danger-bold)] text-[var(--ds-color-text-inverse)] hover:brightness-110 active:brightness-95 shadow-[var(--ds-elevation-shadow-raised)]",
        discovery:
          "bg-[var(--ds-color-background-discovery-bold)] text-[var(--ds-color-text-inverse)] hover:brightness-110 active:brightness-95 shadow-[var(--ds-elevation-shadow-raised)]",
      },
      spacing: {
        default: "h-9 px-3 text-[length:var(--ds-font-size-200)] [&_svg]:size-4",
        compact: "h-7 px-2 text-[length:var(--ds-font-size-100)] [&_svg]:size-3.5",
        none: "h-auto p-0 text-[length:var(--ds-font-size-200)] [&_svg]:size-4",
      },
      isSelected: {
        true: "bg-[var(--ds-color-background-selected)] text-[var(--ds-color-text-selected)] hover:bg-[var(--ds-color-background-selected-hovered)]",
      },
      shouldFitContainer: {
        true: "w-full",
      },
    },
    compoundVariants: [
      // When `link` appearance is active, spacing shouldn't add padding.
      { appearance: "link", spacing: "default", className: "h-auto px-0" },
      { appearance: "link", spacing: "compact", className: "h-auto px-0" },
    ],
    defaultVariants: {
      appearance: "default",
      spacing: "default",
    },
  },
);

export type ButtonAppearance =
  | "default"
  | "primary"
  | "subtle"
  | "subtle-link"
  | "link"
  | "warning"
  | "danger"
  | "discovery";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled">,
    Omit<VariantProps<typeof buttonStyles>, "isSelected" | "shouldFitContainer"> {
  /** Visual variant. Mirrors Atlaskit `appearance`. */
  appearance?: ButtonAppearance;
  /** Size / density. */
  spacing?: "default" | "compact" | "none";
  /** Icon rendered before the label. */
  iconBefore?: React.ReactNode;
  /** Icon rendered after the label. */
  iconAfter?: React.ReactNode;
  /** Disables the button and renders in disabled style. */
  isDisabled?: boolean;
  /** Shows a spinner and disables interaction. Preserves button width. */
  isLoading?: boolean;
  /** Indicates selected state — useful for toolbars / toggle groups. */
  isSelected?: boolean;
  /** Expand to fill the parent width. */
  shouldFitContainer?: boolean;
  /** Compose the click target onto a child element (e.g. `<a>`). */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      appearance,
      spacing,
      iconBefore,
      iconAfter,
      isDisabled,
      isLoading,
      isSelected,
      shouldFitContainer,
      asChild,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const disabled = isDisabled || isLoading;

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        aria-disabled={disabled || undefined}
        aria-pressed={isSelected || undefined}
        disabled={asChild ? undefined : disabled}
        className={cn(
          buttonStyles({ appearance, spacing, isSelected, shouldFitContainer }),
          className,
        )}
        {...rest}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <>
            {iconBefore ? <span className="shrink-0">{iconBefore}</span> : null}
            {children}
            {iconAfter ? <span className="shrink-0">{iconAfter}</span> : null}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "DS.Button";

/** `LinkButton` — an Atlaskit convenience for `<Button asChild><a /></Button>`. */
export const LinkButton = React.forwardRef<
  HTMLAnchorElement,
  ButtonProps & { href: string }
>(({ href, ...props }, ref) => (
  <Button asChild {...props}>
    {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
    <a ref={ref} href={href} />
  </Button>
));
LinkButton.displayName = "DS.LinkButton";

export { buttonStyles };
