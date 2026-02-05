/**
 * Priorities10Icon - Custom Lucide-style icon displaying "10"
 * Matches the Lucide icon design language with consistent stroke width
 */

import React from 'react';

interface Priorities10IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export const Priorities10Icon: React.FC<Priorities10IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* "1" character - vertical line with small top serif */}
      <path d="M7 6L9 5V19" />
      
      {/* "0" character - oval/circle */}
      <ellipse cx="16.5" cy="12" rx="4" ry="7" />
    </svg>
  );
};

export default Priorities10Icon;
