/**
 * CatalystPageHeader — Canonical page header for the entire Catalyst platform.
 *
 * Design: Option A — Clean Minimal (Linear-style)
 * - Title only: 20px Sora 700, −0.3px tracking
 * - No subtitle — context moves to toolbar pills / tabs
 * - No bottom border — seamless blend into content
 * - Fixed height: 52px
 * - Padding: 0 24px (aligns with sidebar divider edge)
 * - Actions slot on the right for buttons
 *
 * Usage:
 *   <CatalystPageHeader title="Board" />
 *   <CatalystPageHeader title="All Projects" actions={<Button>+ New</Button>} />
 */

import React from 'react';
import { useTheme } from '@/hooks/useTheme';

interface CatalystPageHeaderProps {
  title: string;
  actions?: React.ReactNode;
  /** Optional leading icon (Lucide component rendered inline) */
  icon?: React.ReactNode;
}

export function CatalystPageHeader({ title, actions, icon }: CatalystPageHeaderProps) {
  const { isDark } = useTheme();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        padding: '0 24px',
        flexShrink: 0,
        background: 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <h1
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: isDark ? '#EDEDED' : '#0F172A',
            letterSpacing: '-0.3px',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {title}
        </h1>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
