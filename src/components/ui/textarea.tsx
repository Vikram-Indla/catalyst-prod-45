/**
 * Textarea — ADS-canonical textarea.
 * Delegates to @atlaskit/textarea. Preserves the shadcn HTML textarea API
 * so all 100 consumers work unchanged.
 */
import * as React from "react";
import AkTextArea from "@atlaskit/textarea";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  resize?: "auto" | "smart" | "vertical" | "horizontal" | "none";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, resize = "smart", disabled, placeholder, value, defaultValue, onChange, rows, maxLength, name, id, ...props }, ref) => {
    return (
      <AkTextArea
        ref={ref}
        name={name}
        id={id}
        placeholder={placeholder}
        value={value as string}
        defaultValue={defaultValue as string}
        onChange={onChange as any}
        isDisabled={disabled}
        resize={resize}
        maxHeight="300px"
        minimumRows={rows || 3}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
