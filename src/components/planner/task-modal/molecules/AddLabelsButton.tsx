// ============================================================================
// MOLECULE: AddLabelsButton — Dashed button to add labels
// ============================================================================

import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import { COLORS } from '../colors';

interface AddLabelsButtonProps {
  onClick?: () => void;
}

export const AddLabelsButton: React.FC<AddLabelsButtonProps> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 18px',
        backgroundColor: isHovered ? COLORS.accentLight : COLORS.surfaceHover,
        border: `2px ${isHovered ? 'solid' : 'dashed'} ${isHovered ? COLORS.accent : COLORS.borderDefault}`,
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 500,
        color: isHovered ? COLORS.accent : COLORS.textMuted,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s ease'
      }}
    >
      <Tag size={18} />
      Add labels
    </button>
  );
};

export default AddLabelsButton;
