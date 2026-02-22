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
      title={label}
      style={{
        background: isActive ? '#EDE9FE' : '#F5F3FF',
        color: '#7C3AED',
        border: '1px solid #DDD6FE',
        borderRadius: '50%',
        width: 34,
        height: 34,
        padding: 0,
        fontSize: '15px',
        fontWeight: 800,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 150ms, border-color 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#EDE9FE'; e.currentTarget.style.borderColor = '#C4B5FD'; }}
      onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#EDE9FE' : '#F5F3FF'; e.currentTarget.style.borderColor = '#DDD6FE'; }}
    >
      ✦
    </button>
  );
}
