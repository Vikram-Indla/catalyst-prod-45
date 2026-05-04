import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

/**
 * Catalyst Design System — TextField
 *
 * Mirrors Atlaskit TextField:
 *   - appearance: "standard" | "subtle" | "none"
 *   - isCompact, isDisabled, isInvalid, isReadOnly, isRequired
 *   - elemBeforeInput, elemAfterInput (icons / adornments)
 *
 * The component renders the bordered container — consumers pass a normal <input>
 * as a child OR rely on the convenience prop-forwarding via `inputRef` + spread.
 *
 * Usage:
 *   <TextField
 *     value={v}
 *     onChange={(e) => set(e.target.value)}
 *     placeholder="Search projects"
 *     elemBeforeInput={<Search size={14} />}
 *   />
 */

const wrapperStyles = cva(
  [
    "relative inline-flex items-center w-full",
    "font-[var(--ds-font-family-body)]",
    "rounded-[var(--ds-radius-200)]",
    "transition-[border-color,box-shadow,background-color] duration-[var(--ds-motion-duration-small)] ease-[var(--ds-motion-ease-out)]",
    "border",
  ],
  {
    variants: {
      appearance: {
        standard:
          "bg-[var(--ds-color-background-input)] border-[var(--ds-color-border-input)] focus-within:border-[var(--ds-color-border-focused)] focus-within:ring-2 focus-within:ring-[var(--ds-color-border-focused)]/20",
        subtle:
          "bg-transparent border-transparent hover:bg-[var(--ds-color-background-neutral-subtle-hovered)] focus-within:border-[var(--ds-color-border-focused)] focus-within:bg-[var(--ds-color-background-input)]",
        none: "bg-transparent border-transparent",
      },
      isCompact: {
        true: "h-7 text-[length:var(--ds-font-size-100)]",
        false: "h-9 text-[length:var(--ds-font-size-200)]",
      },
      isDisabled: {
        true: "!bg-[var(--ds-color-background-disabled)] !border-[var(--ds-color-border-disabled)] cursor-not-allowed opacity-70",
      },
      isInvalid: {
        true: "!border-[var(--ds-color-border-danger)] focus-within:!ring-[var(--ds-color-border-danger)]/25",
      },
      isReadOnly: {
        true: "bg-[var(--ds-elevation-surface-sunken)] border-transparent",
      },
    },
    defaultVariants: {
      appearance: "standard",
      isCompact: false,
    },
  },
);

export type TextFieldAppearance = "standard" | "subtle" | "none";

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "disabled" | "readOnly" | "required">,
    Omit<VariantProps<typeof wrapperStyles>, "appearance"> {
  appearance?: TextFieldAppearance;
  isCompact?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  /** Element rendered inside the field, before the input — e.g. a search icon. */
  elemBeforeInput?: React.ReactNode;
  /** Element rendered inside the field, after the input — e.g. a clear button. */
  elemAfterInput?: React.ReactNode;
  /** Additional class for the outer wrapper. */
  wrapperClassName?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      appearance = "standard",
      isCompact,
      isDisabled,
      isInvalid,
      isReadOnly,
      isRequired,
      elemBeforeInput,
      elemAfterInput,
      className,
      wrapperClassName,
      ...rest
    },
    ref,
  ) => {
    return (
      <div
        className={cn(
          wrapperStyles({ appearance, isCompact, isDisabled, isInvalid, isReadOnly }),
          wrapperClassName,
        )}
        data-invalid={isInvalid || undefined}
      >
        {elemBeforeInput ? (
          <span className="pl-[var(--ds-space-100)] pr-[var(--ds-space-050)] flex items-center text-[var(--ds-color-icon-subtle)] [&_svg]:size-4">
            {elemBeforeInput}
          </span>
        ) : null}

        <input
          ref={ref}
          disabled={isDisabled}
          readOnly={isReadOnly}
          required={isRequired}
          aria-invalid={isInvalid || undefined}
          aria-required={isRequired || undefined}
          className={cn(
            "flex-1 bg-transparent outline-none border-0",
            "text-[var(--ds-color-text)] placeholder:text-[var(--ds-color-text-subtlest)]",
            "disabled:cursor-not-allowed",
            elemBeforeInput ? "" : "pl-[var(--ds-space-150)]",
            elemAfterInput ? "" : "pr-[var(--ds-space-150)]",
            className,
          )}
          {...rest}
        />

        {elemAfterInput ? (
          <span className="pr-[var(--ds-space-100)] pl-[var(--ds-space-050)] flex items-center text-[var(--ds-color-icon-subtle)] [&_svg]:size-4">
            {elemAfterInput}
          </span>
        ) : null}
      </div>
    );
  },
);
TextField.displayName = "DS.TextField";

/** Atlaskit-style label + helper/error text wrapper. Pair with TextField. */
export interface FieldProps {
  label?: React.ReactNode;
  name?: string;
  isRequired?: boolean;
  helperText?: React.ReactNode;
  errorMessage?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  name,
  isRequired,
  helperText,
  errorMessage,
  children,
  className,
}) => {
  const describedById = name ? `${name}-description` : undefined;
  return (
    <div className={cn("flex flex-col gap-[var(--ds-space-050)]", className)}>
      {label ? (
        <label
          htmlFor={name}
          className="text-[length:var(--ds-font-size-100)] font-[number:var(--ds-font-weight-semibold)] text-[var(--ds-color-text)]"
        >
          {label}
          {isRequired ? (
            <span className="ml-1 text-[var(--ds-color-text-danger)]" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {errorMessage ? (
        <span
          id={describedById}
          role="alert"
          className="text-[length:var(--ds-font-size-075)] text-[var(--ds-color-text-danger)]"
        >
          {errorMessage}
        </span>
      ) : helperText ? (
        <span
          id={describedById}
          className="text-[length:var(--ds-font-size-075)] text-[var(--ds-color-text-subtlest)]"
        >
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
