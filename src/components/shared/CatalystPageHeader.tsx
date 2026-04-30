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
 *              ↳ Loop 5 (2026-04-30): collapses to 0 12px at <1024px so the
 *                title + actions cluster fits without overlap on iPhone/iPad.
 *   title:     <Heading as="h1" size="large">{title}</Heading>
 *              → Atlassian Sans 20/600/-0.003em via @atlaskit/heading
 *              ↳ Loop 5: title row gets nowrap + ellipsis so long titles
 *                don't wrap to 2 lines and crowd the action cluster.
 *   actions:   rendered in an <Inline> slot on the right
 *              ↳ Loop 5: action cluster is flex-shrink:0, ensuring CTAs
 *                stay readable even when the title has to ellipsize.
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
import { useNavBreakpoint } from '@/hooks/useNavBreakpoint';

interface CatalystPageHeaderProps {
  title: string;
  actions?: React.ReactNode;
  /** Optional leading icon (Lucide component rendered inline) */
  icon?: React.ReactNode;
}

export function CatalystPageHeader({ title, actions, icon }: CatalystPageHeaderProps) {
  // Loop 5 (2026-04-30): tighter padding + ellipsis at <1024px so the title
  // doesn't wrap to two lines and the actions cluster doesn't overlap it.
  // Desktop (≥1024px) is byte-identical to baseline.
  const { isNarrow } = useNavBreakpoint();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        padding: isNarrow ? '0 12px' : '0 24px',
        flexShrink: 0,
        background: 'transparent',
        gap: 12,
        // Allow children (title) to shrink so actions don't get pushed off
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
          flex: '1 1 auto',
          // Force single-line + ellipsis on the title row at narrow widths.
          // The Heading component itself doesn't truncate; we rely on the
          // wrapper to clip overflow and rely on whiteSpace:nowrap inheriting
          // into the heading text.
          ...(isNarrow
            ? {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }
            : null),
        }}
      >
        {icon}
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: isNarrow ? 'nowrap' : undefined,
            display: 'block',
          }}
        >
          <Heading as="h1" size="large">
            {title}
          </Heading>
        </span>
      </div>

      {actions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
