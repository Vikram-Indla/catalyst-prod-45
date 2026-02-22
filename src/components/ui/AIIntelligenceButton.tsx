/**
 * AIIntelligenceButton — Solid purple AI button
 * Per platform standard: #7C3AED bg, white text, 8px border-radius
 */
import React from 'react';

interface AIIntelligenceButtonProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

export function AIIntelligenceButton({
  label,
  isActive = false,
  onClick,
  className,
}: AIIntelligenceButtonProps) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        background: isActive ? '#F5F3FF' : '#FFFFFF',
        color: '#7C3AED',
        border: '1px solid #DDD6FE',
        borderRadius: '8px',
        padding: '7px 14px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'background 150ms, border-color 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F5F3FF'; e.currentTarget.style.borderColor = '#C4B5FD'; }}
      onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#F5F3FF' : '#FFFFFF'; e.currentTarget.style.borderColor = '#DDD6FE'; }}
    >
      <span style={{ fontSize: '11px', fontWeight: 800 }}>✦</span>
      {label}
    </button>
  );
}
