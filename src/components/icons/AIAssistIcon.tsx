import React, { CSSProperties } from 'react';

interface IconProps {
  className?: string;
  style?: CSSProperties;
}

export const AIAssistIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg 
    viewBox="0 0 20 20" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    aria-hidden="true" 
    className={className} 
    style={style}
  >
    {/* Brain/AI representation */}
    <circle cx="10" cy="8" r="4" />
    <path d="M6 8 C6 6 8 4 10 4 C12 4 14 6 14 8" />
    <path d="M7 7.5 L8.5 7.5" />
    <path d="M11.5 7.5 L13 7.5" />
    {/* Neural connections */}
    <path d="M10 12 L10 14" />
    <path d="M7 11 L5 13" />
    <path d="M13 11 L15 13" />
    {/* Sparkle/magic dot */}
    <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export default AIAssistIcon;
