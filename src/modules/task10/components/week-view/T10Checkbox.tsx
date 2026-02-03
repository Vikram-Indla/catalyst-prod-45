// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ CHECKBOX COMPONENT
// - Pop animation on check
// - Prominent styling for better visibility
// ═══════════════════════════════════════════════════════════════════════════

import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface T10CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function T10Checkbox({ checked, onChange, disabled = false }: T10CheckboxProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (checked) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [checked]);

  const baseStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: checked ? 'none' : '2px solid #d1d5db',
    backgroundColor: checked ? '#10b981' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    transform: isAnimating ? 'scale(1.15)' : 'scale(1)',
    flexShrink: 0,
  };

  const hoverStyle = !checked && !disabled ? {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  } : {};

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      style={baseStyle}
      onClick={() => !disabled && onChange(!checked)}
      onMouseEnter={(e) => {
        if (!checked && !disabled) {
          e.currentTarget.style.borderColor = '#10b981';
          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked && !disabled) {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {checked && <Check size={14} strokeWidth={3} color="white" />}
    </button>
  );
}

export default T10Checkbox;
