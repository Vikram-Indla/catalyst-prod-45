/**
 * Input — ADS-canonical text input.
 * Delegates to @atlaskit/textfield. Preserves the shadcn HTML input API
 * so all 281 consumers work unchanged.
 */
import * as React from "react";
import Textfield from "@atlaskit/textfield";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, disabled, placeholder, value, defaultValue, onChange, name, id, ...props }, ref) => {
    return (
      <Textfield
        ref={ref}
        name={name}
        id={id}
        type={type}
        placeholder={placeholder}
        value={value as string}
        defaultValue={defaultValue as string}
        onChange={onChange as any}
        isDisabled={disabled}
        isCompact={false}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
