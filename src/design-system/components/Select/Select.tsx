import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Catalyst Design System — Select (single-value)
 *
 * Mirrors the Atlaskit Select API surface:
 *   - options: { label, value, description?, isDisabled? }[]
 *   - value, defaultValue, onChange(value)
 *   - appearance: "default" | "subtle"
 *   - isCompact, isDisabled, isInvalid
 *   - placeholder
 *
 * Built on @radix-ui/react-select for keyboard + screen-reader support.
 * A full multi-select with chips is a phase-2 component.
 */

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  isDisabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  appearance?: "default" | "subtle";
  isCompact?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  name?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Select…",
  appearance = "default",
  isCompact,
  isDisabled,
  isInvalid,
  name,
  id,
  className,
  "aria-label": ariaLabel,
}) => {
  const triggerStyles = cn(
    "inline-flex w-full items-center justify-between gap-[var(--ds-space-100)]",
    "font-[var(--ds-font-family-body)]",
    "rounded-[var(--ds-radius-200)] border",
    "transition-all duration-[var(--ds-motion-duration-small)] ease-[var(--ds-motion-ease-out)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--ds-color-border-focused)]/25 focus:border-[var(--ds-color-border-focused)]",
    "disabled:cursor-not-allowed disabled:opacity-60",
    appearance === "default"
      ? "bg-[var(--ds-color-background-input)] border-[var(--ds-color-border-input)] hover:bg-[var(--ds-color-background-input-hovered)]"
      : "bg-transparent border-transparent hover:bg-[var(--ds-color-background-neutral-subtle-hovered)]",
    isCompact ? "h-7 px-2 text-[length:var(--ds-font-size-100)]" : "h-9 px-3 text-[length:var(--ds-font-size-200)]",
    isInvalid && "!border-[var(--ds-color-border-danger)]",
    "text-[var(--ds-color-text)] data-[placeholder]:text-[var(--ds-color-text-subtlest)]",
    className,
  );

  return (
    <RadixSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onChange}
      disabled={isDisabled}
      name={name}
    >
      <RadixSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={isInvalid || undefined}
        className={triggerStyles}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown size={14} className="text-[var(--ds-color-icon-subtle)]" aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden",
            "bg-[var(--ds-elevation-surface-overlay)] border border-[var(--ds-color-border)]",
            "rounded-[var(--ds-radius-200)] shadow-[var(--ds-elevation-shadow-overlay)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <RadixSelect.Viewport className="p-[var(--ds-space-050)]">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.isDisabled}
                className={cn(
                  "relative flex cursor-pointer select-none items-center",
                  "px-[var(--ds-space-200)] py-[var(--ds-space-100)] pl-[var(--ds-space-400)]",
                  "text-[length:var(--ds-font-size-200)] text-[var(--ds-color-text)]",
                  "rounded-[var(--ds-radius-100)] outline-none",
                  "data-[highlighted]:bg-[var(--ds-color-background-selected)] data-[highlighted]:text-[var(--ds-color-text-selected)]",
                  "data-[disabled]:text-[var(--ds-color-text-disabled)] data-[disabled]:cursor-not-allowed",
                )}
              >
                <span className="absolute left-[var(--ds-space-100)] flex size-4 items-center justify-center">
                  <RadixSelect.ItemIndicator>
                    <Check size={14} />
                  </RadixSelect.ItemIndicator>
                </span>
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                {opt.description ? (
                  <span className="ml-[var(--ds-space-200)] text-[length:var(--ds-font-size-100)] text-[var(--ds-color-text-subtlest)]">
                    {opt.description}
                  </span>
                ) : null}
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
};

Select.displayName = "DS.Select";
