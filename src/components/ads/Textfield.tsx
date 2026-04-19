/**
 * Textfield — Catalyst wrapper over @atlaskit/textfield.
 *
 * Single-line text input. Use Textarea (separate wrapper) for multi-line,
 * and the Editor wrapper for rich-text (ADF).
 */
import AkTextfield from '@atlaskit/textfield';
import { type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';

export interface TextfieldProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  /** Validation state — shows the matching border + icon. */
  isInvalid?: boolean;
  /** Full-width within its container. Default true. */
  isFullWidth?: boolean;
  /** 'compact' → 32px tall; 'default' → 40px tall. */
  spacing?: 'default' | 'compact' | 'none';
  /** Node rendered inside the left edge (icon or badge). */
  elemBeforeInput?: ReactNode;
  /** Node rendered inside the right edge (clear button, loading). */
  elemAfterInput?: ReactNode;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  name?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
  autoFocus?: boolean;
  maxLength?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
  testId?: string;
}

export function Textfield({
  value,
  defaultValue,
  placeholder,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  isFullWidth = true,
  spacing = 'default',
  elemBeforeInput,
  elemAfterInput,
  onChange,
  onKeyDown,
  onBlur,
  onFocus,
  name,
  type = 'text',
  autoFocus,
  maxLength,
  testId,
  ...rest
}: TextfieldProps) {
  return (
    <AkTextfield
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      isRequired={isRequired}
      isInvalid={isInvalid}
      width={isFullWidth ? '100%' : undefined}
      isCompact={spacing === 'compact'}
      elemBeforeInput={elemBeforeInput}
      elemAfterInput={elemAfterInput}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onFocus={onFocus}
      name={name}
      type={type}
      autoFocus={autoFocus}
      maxLength={maxLength}
      aria-label={rest['aria-label']}
      aria-describedby={rest['aria-describedby']}
      testId={testId}
    />
  );
}
