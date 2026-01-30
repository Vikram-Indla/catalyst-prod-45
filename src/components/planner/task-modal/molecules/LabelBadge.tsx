// ============================================================================
// MOLECULE: LabelBadge — Single label display
// ============================================================================

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Label } from '../types/labels';

interface LabelBadgeProps {
  label: Label;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  showRemove?: boolean;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  onRemove,
  size = 'md',
  showRemove = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizes = {
    sm: { padding: '2px 8px', fontSize: '11px', gap: '4px', iconSize: 10 },
    md: { padding: '4px 10px', fontSize: '12px', gap: '6px', iconSize: 12 }
  };

  const s = sizes[size];

  const bgColor = label.color + '20'; // 20% opacity
  const borderColor = label.color + '40'; // 40% opacity

  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        fontSize: s.fontSize,
        fontWeight: 500,
        color: label.color,
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease'
      }}
    >
      {/* COLOR DOT */}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: label.color,
          flexShrink: 0
        }}
      />
      
      {/* LABEL NAME */}
      {label.name}

      {/* REMOVE BUTTON */}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${s.iconSize + 4}px`,
            height: `${s.iconSize + 4}px`,
            marginLeft: '2px',
            marginRight: '-4px',
            backgroundColor: isHovered ? label.color + '30' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: label.color,
            cursor: 'pointer',
            padding: 0,
            opacity: isHovered ? 1 : 0.6,
            transition: 'all 0.15s ease'
          }}
        >
          <X size={s.iconSize} />
        </button>
      )}
    </span>
  );
};

export default LabelBadge;
