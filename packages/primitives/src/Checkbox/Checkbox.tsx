import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Icon } from "@catylast/icons";
import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from "react";

import { cx } from "../utils/classNames";
import * as styles from "./Checkbox.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type CheckboxSize = "small" | "medium" | "large";

/** Legacy short-form size aliases from v0.1. */
export type CheckboxSizeAlias = CheckboxSize | "sm" | "md";

type RadixCheckboxProps = ComponentPropsWithoutRef<typeof RadixCheckbox.Root>;

type CheckboxOwnProps = {
  /** Optional label rendered next to the checkbox. */
  label?: ReactNode;
  /** Visual size scale. @default "medium" */
  size?: CheckboxSizeAlias;
  /** Controlled checked state. */
  isChecked?: boolean;
  /** Uncontrolled initial checked state. */
  defaultChecked?: boolean;
  /** Render the partial / mixed-state dash glyph instead of a check. */
  isIndeterminate?: boolean;
  /** Disable interaction; reduce opacity. */
  isDisabled?: boolean;
  /** Error state — red border, red filled background when checked. */
  isInvalid?: boolean;
  /** Render a red asterisk after the label and set the `required` attribute. */
  isRequired?: boolean;
  /**
   * Called when the user toggles the checkbox. Receives the new boolean
   * checked value (the indeterminate visual is purely cosmetic — toggling
   * out of indeterminate produces `true`).
   */
  onChange?: (checked: boolean) => void;
  /**
   * Legacy v0.1 prop — accepted for backwards compatibility. Prefer
   * `isChecked` (or pair it with `isIndeterminate` for the mixed state).
   * Pass `"indeterminate"` here is equivalent to `isIndeterminate`.
   */
  checked?: boolean | "indeterminate";
  /**
   * Legacy v0.1 prop — accepted for backwards compatibility. Prefer
   * `onChange` (which receives a plain boolean). When the previous state
   * is `indeterminate`, this still fires with `"indeterminate"` — match
   * the Radix shape.
   */
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
};

export type CheckboxProps = Omit<
  RadixCheckboxProps,
  | "children"
  | "checked"
  | "defaultChecked"
  | "disabled"
  | "required"
  | "onCheckedChange"
  | "onChange"
> &
  CheckboxOwnProps;

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

const SIZE_ALIAS: Record<string, CheckboxSize> = {
  sm: "small",
  md: "medium",
};

function resolveSize(size?: CheckboxSizeAlias): CheckboxSize {
  if (!size) return "medium";
  return (SIZE_ALIAS[size] ?? size) as CheckboxSize;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export const Checkbox = forwardRef<
  ElementRef<typeof RadixCheckbox.Root>,
  CheckboxProps
>(function Checkbox(
  {
    className,
    label,
    size,
    isChecked,
    defaultChecked,
    isIndeterminate = false,
    isDisabled,
    isInvalid = false,
    isRequired = false,
    onChange,
    checked,
    onCheckedChange,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const resolvedSize = resolveSize(size);

  // Legacy: callers using `disabled` (the native attr) get the same
  // behaviour as `isDisabled`.
  const restRecord = rest as Record<string, unknown>;
  const legacyDisabled = restRecord.disabled === true;
  const effectiveDisabled = isDisabled ?? legacyDisabled;
  if ("disabled" in restRecord) delete restRecord.disabled;

  // Reconcile checked + indeterminate into Radix's union type. Only pass
  // `checked` when explicitly controlled — otherwise let Radix manage
  // internal state via `defaultChecked`. The legacy `checked` prop
  // accepts the full `boolean | "indeterminate"` union; `isChecked` /
  // `isIndeterminate` are the new split-prop API.
  const legacyIndeterminate = checked === "indeterminate";
  const legacyChecked = legacyIndeterminate ? undefined : (checked as boolean | undefined);
  const effectiveIndeterminate = isIndeterminate || legacyIndeterminate;
  const explicitChecked = isChecked ?? legacyChecked;
  const radixCheckedProps: Partial<
    Pick<RadixCheckboxProps, "checked" | "defaultChecked">
  > = effectiveIndeterminate
    ? { checked: "indeterminate" }
    : explicitChecked !== undefined
      ? { checked: explicitChecked }
      : defaultChecked !== undefined
        ? { defaultChecked }
        : {};

  const handleCheckedChange: RadixCheckboxProps["onCheckedChange"] = (next) => {
    onChange?.(next === true);
    onCheckedChange?.(next);
  };

  const box = (
    <RadixCheckbox.Root
      ref={ref}
      id={checkboxId}
      {...radixCheckedProps}
      onCheckedChange={handleCheckedChange}
      disabled={effectiveDisabled}
      required={isRequired}
      data-invalid={isInvalid || undefined}
      aria-invalid={isInvalid || undefined}
      className={cx(styles.root, styles.size[resolvedSize], className)}
      {...restRecord}
    >
      <RadixCheckbox.Indicator className={styles.indicator}>
        <span className={styles.checkOnly}>
          <Icon name="check" size={resolvedSize === "small" ? 10 : 12} />
        </span>
        <span className={styles.indeterminateOnly}>
          <Icon name="minus" size={resolvedSize === "small" ? 10 : 12} />
        </span>
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );

  if (label !== undefined && label !== null && label !== false) {
    return (
      <label className={styles.wrapper} htmlFor={checkboxId}>
        {box}
        <span className={styles.label}>
          {label}
          {isRequired && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
        </span>
      </label>
    );
  }
  return box;
});
