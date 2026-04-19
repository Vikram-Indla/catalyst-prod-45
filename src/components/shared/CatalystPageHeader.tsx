// @ts-nocheck
/**
 * CatalystPageHeader — Canonical page header for the entire Catalyst platform.
 *
 * Apr 2026 (Decision A): Restyled to match BacklogPage.atlaskit.tsx:1119-1123
 * measurements. No breadcrumb — callers render breadcrumbs above this header.
 *
 * Surface chrome (locked)
 * ──────────────────────
 *   height:    52px (fixed)
 *   padding:   0 24px (aligns with sidebar divider edge)
 *   title:     <Heading as="h1" size="large">{title}</Heading>
 *              → Atlassian Sans 20/600/-0.003em via @atlaskit/heading
 *   actions:   rendered in an <Inline> slot on the right
 *
 * Rewritten Apr 19, 2026 — inline font/color styles replaced with the ADS
 * Heading wrapper. Light/dark theming now flows through @atlaskit/tokens
 * via AdsThemeProvider; no `useTheme`/`isDark` branching needed here.
 *
 * Usage
 * ─────
 *   <CatalystPageHeader title="Board" />
 *   <CatalystPageHeader title="All Projects" actions={<Button>+ New</Button>} />
 */

import React from 'react';
import { Heading } from '@/components/ads';

interface CatalystPageHeaderProps {
  title: string;
  actions?: React.ReactNode;
  /** Optional leading icon (Lucide component rendered inline) */
  icon?: React.ReactNode;
}

export function CatalystPageHeader({ title, actions, icon }: CatalystPageHeaderProps) {
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
        <Heading as="h1" size="large">
          {title}
        </Heading>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
