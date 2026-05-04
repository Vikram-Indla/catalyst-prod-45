import * as React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Catalyst Design System — Checkbox
 *
 * Mirrors Atlaskit Checkbox:
 *   - isChecked (controlled), defaultChecked
 *   - isIndeterminate, isDisabled, isInvalid, isRequired
 *   - label (renders adjacent <label>)
 *   - name, value, onChange(isChecked, event)
 */

export interface CheckboxProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root>,
    "checked" | "defaultChecked" | "onCheckedChange" | "onChange" | "disabled" | "required"
  > {
  isChecked?: boolean;
  defaultChecked?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  onChange?: (isChecked: boolean, event?: React.FormEvent) => void;
}

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof RadixCheckbox.Root>,
  CheckboxProps
>(
  (
    {
      isChecked,
      defaultChecked,
      isIndeterminate,
      isDisabled,
      isInvalid,
      isRequired,
      label,
      description,
      onChange,
      id: idProp,
      className,
      ...rest
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;
    const checkedValue: RadixCheckbox.CheckedState | undefined =
      isIndeterminate ? "indeterminate" : isChecked;

    return (
      <div className={cn("inline-flex items-start gap-[var(--ds-space-100)]", className)}>
        <RadixCheckbox.Root
          ref={ref}
          id={id}
          checked={checkedValue}
          defaultChecked={defaultChecked}
          disabled={isDisabled}
          required={isRequired}
          aria-invalid={isInvalid || undefined}
          onCheckedChange={(next) => {
            // Radix emits "indeterminate" or boolean. Translate to a plain boolean.
            const value = next === true;
            onChange?.(value);
          }}
          className={cn(
            "peer relative size-4 shrink-0 mt-[2px]",
            "rounded-[var(--ds-radius-100)] border",
            "bg-[var(--ds-color-background-input)] border-[var(--ds-color-border-input)]",
            "transition-colors duration-[var(--ds-motion-duration-small)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-border-focused)]/25 focus-visible:border-[var(--ds-color-border-focused)]",
            "data-[state=checked]:bg-[var(--ds-color-background-accent-blue-bolder)] data-[state=checked]:border-[var(--ds-color-background-accent-blue-bolder)]",
            "data-[state=indeterminate]:bg-[var(--ds-color-background-accent-blue-bolder)] data-[state=indeterminate]:border-[var(--ds-color-background-accent-blue-bolder)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isInvalid && "!border-[var(--ds-color-border-danger)]",
          )}
          {...rest}
        >
          <RadixCheckbox.Indicator className="flex items-center justify-center text-[var(--ds-color-text-inverse)]">
            {isIndeterminate ? <Minus size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        {(label || description) && (
          <div className="flex flex-col gap-[2px] select-none">
            {label ? (
              <label
                htmlFor={id}
                className={cn(
                  "text-[length:var(--ds-font-size-200)] text-[var(--ds-color-text)] cursor-pointer",
                  isDisabled && "cursor-not-allowed text-[var(--ds-color-text-disabled)]",
                )}
              >
                {label}
                {isRequired ? (
                  <span className="ml-1 text-[var(--ds-color-text-danger)]" aria-hidden>
                    *
                  </span>
                ) : null}
              </label>
            ) : null}
            {description ? (
              <span className="text-[length:var(--ds-font-size-100)] text-[var(--ds-color-text-subtlest)]">
                {description}
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  },
);
Checkbox.displayName = "DS.Checkbox";
