/**
 * AIIntelligenceButton — Solid blue AI button
 * Per platform standard: #2563EB bg, white text, 8px border-radius
 */
import React from 'react';

export interface AIIntelligenceButtonProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export function AIIntelligenceButton({
  label,
  isActive = false,
  onClick,
  className,
  disabled = false,
}: AIIntelligenceButtonProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={className}
      disabled={disabled}
      style={{
        background: disabled ? '#94A3B8' : isActive ? '#1D4ED8' : '#2563EB',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '8px',
        padding: '7px 14px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'background 150ms',
        boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
      onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#1D4ED8' : '#2563EB'; }}
    >
      <span style={{ fontSize: '11px', fontWeight: 800 }}>✦</span>
      {label}
    </button>
  );
}
