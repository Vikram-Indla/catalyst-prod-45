/**
 * Checkbox — ADS-canonical checkbox.
 * Delegates to @atlaskit/checkbox. Preserves shadcn API
 * (checked/onCheckedChange) so all 124 consumers work unchanged.
 */
import * as React from "react";
import { Checkbox as AkCheckbox } from "@atlaskit/checkbox";

interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  value?: string;
  className?: string;
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, defaultChecked, onCheckedChange, onChange, disabled, id, name, value, label, className }, ref) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onCheckedChange?.(e.target.checked);
        onChange?.(e.target.checked);
      },
      [onCheckedChange, onChange]
    );

    return (
      <AkCheckbox
        isChecked={checked}
        defaultChecked={defaultChecked}
        onChange={handleChange}
        isDisabled={disabled}
        name={name}
        value={value}
        label={label || ""}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
export type { CheckboxProps };
