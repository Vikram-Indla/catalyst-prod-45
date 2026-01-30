// ============================================================================
// MOLECULE: AddItemInput — Input for adding checklist items
// ============================================================================

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { COLORS } from '../colors';

interface AddItemInputProps {
  placeholder?: string;
  onAdd: (text: string) => void;
}

export const AddItemInput: React.FC<AddItemInputProps> = ({
  placeholder = 'Add checklist item...',
  onAdd
}) => {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        backgroundColor: isFocused ? COLORS.surfaceCard : COLORS.surfacePage,
        border: `2px ${isFocused ? 'solid' : 'dashed'} ${isFocused ? COLORS.accent : COLORS.borderDefault}`,
        borderRadius: '10px',
        transition: 'all 0.2s ease'
      }}
    >
      {/* PLUS ICON — 22px blue box */}
      <div
        style={{
          width: '22px',
          height: '22px',
          backgroundColor: COLORS.accent,
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Plus size={14} style={{ color: '#ffffff' }} />
      </div>

      {/* INPUT */}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: 'none',
          backgroundColor: 'transparent',
          fontSize: '14px',
          color: COLORS.textPrimary,
          fontFamily: 'inherit',
          outline: 'none'
        }}
      />
    </div>
  );
};

export default AddItemInput;
