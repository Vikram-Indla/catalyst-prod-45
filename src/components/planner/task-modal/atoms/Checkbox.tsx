// ============================================================================
// ATOM: Checkbox — 22px square checkbox
// ============================================================================

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { COLORS } from '../colors';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({ 
  checked, 
  onChange 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        minWidth: '22px',
        minHeight: '22px',
        borderRadius: '6px',
        border: `2px solid ${checked ? COLORS.accent : (isHovered ? COLORS.accent : COLORS.borderDefault)}`,
        backgroundColor: checked ? COLORS.accent : COLORS.surfaceCard,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease'
      }}
    >
      {checked && <Check size={14} color="var(--ds-surface, var(--ds-surface, #ffffff))" />}
    </div>
  );
};

export default Checkbox;
