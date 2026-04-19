/**
 * Checkbox — Catalyst wrapper over @atlaskit/checkbox.
 */
import AkCheckbox from '@atlaskit/checkbox';
import { type ChangeEvent, type ReactNode } from 'react';

export interface CheckboxProps {
  isChecked?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  label?: ReactNode;
  name?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  'aria-label'?: string;
  testId?: string;
}

export function Checkbox({
  isChecked,
  isIndeterminate,
  isDisabled,
  isRequired,
  isInvalid,
  label,
  name,
  value,
  onChange,
  testId,
  ...rest
}: CheckboxProps) {
  return (
    <AkCheckbox
      isChecked={isChecked}
      isIndeterminate={isIndeterminate}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      aria-label={rest['aria-label']}
      testId={testId}
    />
  );
}
