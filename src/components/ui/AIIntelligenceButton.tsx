/**
 * AIIntelligenceButton — Blue-to-purple gradient pill
 * Platform standard: gradient bg, white text, pill shape, Zap icon
 */
import React from 'react';
import { Zap } from 'lucide-react';

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
        background: disabled
          ? '#94A3B8'
          : '#2563EB',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 20,
        padding: '0 16px',
        height: 32,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 200ms ease',
        fontFamily: 'var(--ds-font-family-body)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.03)';
        e.currentTarget.style.boxShadow = '0 0 0 6px rgba(37,99,235,0.15)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <Zap size={13} strokeWidth={2.2} />
      {label}
    </button>
  );
}
