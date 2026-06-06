/**
 * RadioGroup — ADS-canonical radio buttons.
 * Delegates to @atlaskit/radio. Preserves shadcn API (value/onValueChange).
 */
import * as React from "react";
import { RadioGroup as AkRadioGroup, Radio as AkRadio } from "@atlaskit/radio";

interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, defaultValue, onValueChange, disabled, className, children }, ref) => {
    return (
      <div ref={ref} className={className} role="radiogroup">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child as React.ReactElement<any>, {
            __selectedValue: value ?? defaultValue,
            __onValueChange: onValueChange,
            __disabled: disabled,
          });
        })}
      </div>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps {
  value: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  __selectedValue?: string;
  __onValueChange?: (value: string) => void;
  __disabled?: boolean;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ value, id, disabled, className, __selectedValue, __onValueChange, __disabled }, ref) => {
    return (
      <AkRadio
        value={value}
        label=""
        name={id}
        isChecked={__selectedValue === value}
        onChange={() => __onValueChange?.(value)}
        isDisabled={disabled || __disabled}
      />
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
