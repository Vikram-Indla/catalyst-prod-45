/**
 * GroupHeader — Collapsible status group header (F1.12)
 *
 * Header for a grouped section showing label, count, and collapse toggle.
 */
import React, { memo } from 'react';

export interface GroupHeaderProps {
  label: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const GroupHeader = memo(function GroupHeader({
  label,
  count,
  isCollapsed,
  onToggle,
}: GroupHeaderProps) {
  return (
    <button
      data-testid="group-header"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 0',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background-color 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div
        data-testid="group-chevron"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          fontSize: '12px',
          color: '#626F86',
          transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 150ms',
        }}
      >
        ▼
      </div>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#172B4D',
          flex: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '12px',
          color: '#626F86',
          fontWeight: 500,
          padding: '2px 6px',
          backgroundColor: '#F1F2F4',
          borderRadius: '3px',
        }}
      >
        {count}
      </span>
    </button>
  );
});
