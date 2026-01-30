// ============================================================================
// ATOM: Label — Uppercase field label
// ============================================================================

import React from 'react';
import { COLORS } from '../colors';

interface LabelProps {
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Label: React.FC<LabelProps> = ({ 
  children, 
  size = 'sm' 
}) => {
  return (
    <span
      style={{
        display: 'block',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: size === 'sm' ? '0.05em' : '0.03em'
      }}
    >
      {children}
    </span>
  );
};

export default Label;
