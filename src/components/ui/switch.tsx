/**
 * Switch — ADS-canonical toggle.
 * Delegates to @atlaskit/toggle. Preserves the shadcn API surface
 * (checked/onCheckedChange) so all 32 consumers work unchanged.
 */
import * as React from "react";
import Toggle from "@atlaskit/toggle";

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  size?: "regular" | "large";
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, defaultChecked, onCheckedChange, disabled, id, name, size = "regular" }, ref) => {
    return (
      <Toggle
        id={id}
        name={name}
        isChecked={checked}
        defaultChecked={defaultChecked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        isDisabled={disabled}
        size={size}
      />
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };
