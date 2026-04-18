/**
 * CatalystPageHeader — Canonical page header for the entire Catalyst platform.
 *
 * Apr 2026 (Decision A): Restyled to match BacklogPage.atlaskit.tsx:1119-1123
 * measurements. No breadcrumb — the top nav + sidebar already show location.
 *
 * - Title only: 20px / weight 600 / #172B4D / -0.003em tracking
 * - Font: Atlassian Sans → Inter fallback
 * - Fixed height: 52px
 * - Padding: 0 24px (aligns with sidebar divider edge)
 * - Actions slot on the right
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
            fontFamily: '"Atlassian Sans", Inter, system-ui, -apple-system, sans-serif',
            fontSize: 20,
            fontWeight: 600,
            color: isDark ? '#EDEDED' : '#172B4D',
            letterSpacing: '-0.003em',
            margin: 0,
            lineHeight: 1.2,
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
