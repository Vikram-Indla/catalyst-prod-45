import * as React from "react";
import * as RadixRadio from "@radix-ui/react-radio-group";
import { cn } from "../../utils/cn";

/**
 * Catalyst Design System — Radio / RadioGroup
 *
 * Mirrors Atlaskit:
 *   <RadioGroup
 *     options={[{ label, value, description?, isDisabled? }]}
 *     value={...}
 *     onChange={(value) => ...}
 *     isDisabled, isRequired, name
 *   />
 *
 * Also exposes low-level <Radio /> + <RadioGroupRoot /> for composition.
 */

export interface RadioOption {
  label: React.ReactNode;
  value: string;
  description?: React.ReactNode;
  isDisabled?: boolean;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
  "aria-label"?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  defaultValue,
  onChange,
  name,
  isDisabled,
  isRequired,
  orientation = "vertical",
  className,
  "aria-label": ariaLabel,
}) => (
  <RadixRadio.Root
    value={value}
    defaultValue={defaultValue}
    onValueChange={onChange}
    disabled={isDisabled}
    required={isRequired}
    name={name}
    aria-label={ariaLabel}
    className={cn(
      "flex",
      orientation === "vertical" ? "flex-col gap-[var(--ds-space-100)]" : "flex-row flex-wrap gap-[var(--ds-space-200)]",
      className,
    )}
  >
    {options.map((opt) => (
      <RadioItem key={opt.value} option={opt} groupDisabled={isDisabled} />
    ))}
  </RadixRadio.Root>
);

const RadioItem: React.FC<{ option: RadioOption; groupDisabled?: boolean }> = ({
  option,
  groupDisabled,
}) => {
  const id = React.useId();
  const disabled = groupDisabled || option.isDisabled;
  return (
    <div className="inline-flex items-start gap-[var(--ds-space-100)]">
      <RadixRadio.Item
        id={id}
        value={option.value}
        disabled={disabled}
        className={cn(
          "peer relative size-4 shrink-0 mt-[2px] rounded-full border",
          "bg-[var(--ds-color-background-input)] border-[var(--ds-color-border-input)]",
          "transition-colors duration-[var(--ds-motion-duration-small)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-border-focused)]/25 focus-visible:border-[var(--ds-color-border-focused)]",
          "data-[state=checked]:border-[var(--ds-color-background-accent-blue-bolder)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <RadixRadio.Indicator className="flex items-center justify-center after:block after:size-2 after:rounded-full after:bg-[var(--ds-color-background-accent-blue-bolder)]" />
      </RadixRadio.Item>
      <label
        htmlFor={id}
        className={cn(
          "flex flex-col gap-[2px] select-none cursor-pointer",
          disabled && "cursor-not-allowed text-[var(--ds-color-text-disabled)]",
        )}
      >
        <span className="text-[length:var(--ds-font-size-200)] text-[var(--ds-color-text)]">
          {option.label}
        </span>
        {option.description ? (
          <span className="text-[length:var(--ds-font-size-100)] text-[var(--ds-color-text-subtlest)]">
            {option.description}
          </span>
        ) : null}
      </label>
    </div>
  );
};

RadioGroup.displayName = "DS.RadioGroup";
