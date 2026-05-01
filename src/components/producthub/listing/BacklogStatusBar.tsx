/**
 * BacklogStatusBar — Overdue pill + Filter slot + total summary
 * Status category chips (To Do / In Progress / Done) removed per V12 simplification.
 * Overdue pill now matches BacklogSubTabs capsule pattern.
 */

import React from 'react';
import type { Request } from '@/types/request';

interface BacklogStatusBarProps {
  items: Request[];
  overdueCount: number;
  overdueActive: boolean;
  onOverdueToggle: () => void;
  filterSlot: React.ReactNode;
}

export function BacklogStatusBar({
  items,
  overdueCount,
  overdueActive,
  onOverdueToggle,
  filterSlot,
}: BacklogStatusBarProps) {
  return (
    <>
      {/* Overdue pill — matches BacklogSubTabs capsule style */}
      <button
        onClick={onOverdueToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 13,
          transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
          cursor: 'pointer',
          border: overdueActive ? 'none' : '1px solid var(--cp-border-default)',
          background: overdueActive ? 'var(--ds-text-danger, #DC2626)' : 'transparent',
          color: overdueActive ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--cp-text-secondary)',
          fontWeight: overdueActive ? 600 : 500,
          outline: 'none',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Overdue
        {overdueCount > 0 && (
          <span
            style={{
              minWidth: 22,
              height: 18,
              padding: '0 6px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: overdueActive ? 'rgba(255,255,255,0.9)' : 'rgba(220, 38, 38, 0.08)',
              color: overdueActive ? 'var(--ds-text-danger, #DC2626)' : 'var(--ds-text-danger, #DC2626)',
            }}
          >
            {overdueCount}
          </span>
        )}
      </button>

      {filterSlot}

      {/* Total summary — right-aligned */}
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-t3)', marginLeft: 'auto' }}>
        <strong style={{ color: 'var(--cp-t1)', fontWeight: 600 }}>{items.length}</strong>
        {' '}business requests
      </span>
    </>
  );
}
