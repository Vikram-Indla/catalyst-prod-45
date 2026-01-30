// ============================================================================
// MOLECULE: DateDropdown — Date field with calendar icon
// ============================================================================

import React, { useState } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { COLORS } from '../colors';
import { Label } from '../atoms';

interface DateDropdownProps {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export const DateDropdown: React.FC<DateDropdownProps> = ({
  label,
  value,
  placeholder = 'Set date...',
  onChange
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasValue = !!value;

  // For now, this is a display-only component
  // Full date picker would be added in a later iteration

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px', 
        position: 'relative' 
      }}
    >
      {/* LABEL */}
      <Label size="md">{label}</Label>

      {/* TRIGGER */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isHovered ? COLORS.borderFocus : COLORS.borderDefault}`,
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        {/* CALENDAR ICON */}
        <Calendar size={18} style={{ color: COLORS.textLight, flexShrink: 0 }} />
        
        {/* DATE TEXT */}
        <span 
          style={{ 
            flex: 1, 
            fontSize: '14px', 
            color: hasValue ? COLORS.textPrimary : COLORS.textLight 
          }}
        >
          {value || placeholder}
        </span>
        
        {/* CHEVRON */}
        <ChevronDown size={16} style={{ color: COLORS.textLight }} />
      </div>
    </div>
  );
};

export default DateDropdown;
