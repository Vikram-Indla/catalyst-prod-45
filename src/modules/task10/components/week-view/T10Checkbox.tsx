// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ CHECKBOX COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { Check } from 'lucide-react';

interface T10CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function T10Checkbox({ checked, onChange, disabled = false }: T10CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      className={`t10-checkbox ${checked ? 't10-checkbox--checked' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      {checked && <Check className="t10-checkbox__icon" />}
    </button>
  );
}

export default T10Checkbox;
