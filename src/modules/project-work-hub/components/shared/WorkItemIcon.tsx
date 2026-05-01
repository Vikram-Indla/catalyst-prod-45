import React from 'react';

interface WorkItemIconProps {
  type: 'epic' | 'feature' | 'story';
  size?: number;
}

export const WorkItemIcon: React.FC<WorkItemIconProps> = ({ type, size = 16 }) => {
  if (type === 'epic') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1h10a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2z" fill="#7C3AED"/>
        <path d="M9.5 4L6.5 8.5H9L7 12l5-5.5H9L10.5 4H9.5z" fill="white"/>
      </svg>
    );
  }
  if (type === 'feature') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="14" height="14" rx="2" fill="#0D9488"/>
        <rect x="4" y="4" width="8" height="3" rx="0.5" fill="white" opacity="0.9"/>
        <rect x="4" y="9" width="8" height="3" rx="0.5" fill="white" opacity="0.6"/>
      </svg>
    );
  }
  // story
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 1h10a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2z" fill="var(--ds-text-success, #16A34A)"/>
      <path d="M5 4h6v2H5zM5 7h6v2H5zM5 10h4v2H5z" fill="white" opacity="0.85"/>
    </svg>
  );
};
