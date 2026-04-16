// ============================================================================
// ATOM: Avatar — Circular avatar with face icon
// GUARDRAIL: Always renders CircleUser face icon (never bare initials).
// ============================================================================

import React from 'react';
import { CircleUser } from 'lucide-react';

interface AvatarProps {
  initials: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: 26, height: 26, icon: 18 },
  md: { width: 36, height: 36, icon: 24 },
  lg: { width: 40, height: 40, icon: 28 }
};

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  color,
  size = 'sm'
}) => {
  const dimensions = SIZES[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${dimensions.width}px`,
        height: `${dimensions.width}px`,
        minWidth: `${dimensions.width}px`,
        minHeight: `${dimensions.width}px`,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    >
      <CircleUser size={dimensions.icon} color="#FFFFFF" strokeWidth={1.5} />
    </span>
  );
};

export default Avatar;
