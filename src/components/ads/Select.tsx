/**
 * Select — Catalyst wrapper over @atlaskit/select.
 *
 * Why we wrap
 * - Atlaskit Select has a deeply nested `OptionType` that carries Atlaskit-
 *   specific shape. We flatten to a Catalyst-owned `{ value, label, icon? }`
 *   item so product code doesn't depend on react-select internals either.
 * - `components` prop (for custom option renderers) is hidden behind simple
 *   `renderOption` / `renderValue` callbacks. Edge cases that genuinely need
 *   full react-select customization get a dedicated wrapper (UserPicker,
 *   ProjectPicker, VersionPicker, etc.) rather than leak react-select into
 *   product code.
 *
 * For user-facing pickers (assignee, reporter, project, version, label)
 * prefer the dedicated wrappers in this folder rather than raw Select.
 */
import AkSelect, { type OptionType as AkOptionType } from '@atlaskit/select';
import { type ReactNode } from 'react';

export interface SelectOption<V extends string | number = string> {
  value: V;
  label: ReactNode;
  /** Disables this option. */
  isDisabled?: boolean;
  /** Free-form data payload — returned in onChange. */
  data?: unknown;
}

export interface SelectProps<V extends string | number = string> {
  options: SelectOption<V>[];
  value?: SelectOption<V> | null;
  onChange?: (next: SelectOption<V> | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  /** Searchable — matches label text. */
  isSearchable?: boolean;
  /** Menu opens upward (for cells near the bottom of the viewport). */
  menuPlacement?: 'auto' | 'top' | 'bottom';
  /** Portal menu to document.body — use inside scrollable parents. */
  usePortal?: boolean;
  'aria-label'?: string;
  testId?: string;
  width?: number | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
}

export function Select<V extends string | number = string>({
  options,
  value,
  onChange,
  placeholder,
  isDisabled,
  isLoading,
  isClearable,
  isSearchable = true,
  menuPlacement = 'auto',
  usePortal,
  testId,
  width = 'medium',
  ...rest
}: SelectProps<V>) {
  return (
    <AkSelect<AkOptionType>
      options={options as unknown as AkOptionType[]}
      value={value as unknown as AkOptionType | null | undefined}
      onChange={(next) => onChange?.(next as unknown as SelectOption<V> | null)}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isLoading={isLoading}
      isClearable={isClearable}
      isSearchable={isSearchable}
      menuPlacement={menuPlacement}
      menuPortalTarget={usePortal ? document.body : undefined}
      aria-label={rest['aria-label']}
      testId={testId}
      spacing="default"
      appearance="default"
      width={width}
    />
  );
}
