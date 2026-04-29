/**
 * HubPageHeader — canonical page header for hub routes.
 *
 * Purpose (Decision A, Apr 2026):
 *   Single primitive that renders a clean h1 inside the white panel, with no
 *   page-level breadcrumb. Matches the measured style of BacklogPage.atlaskit.tsx
 *   so every hub page reads with the same rhythm as the BAU backlog.
 *
 * Why no breadcrumb:
 *   The top nav shows the hub, the left sidebar shows the section, so
 *   "StrategyHub > Themes" duplicates what's already visible. This matches the
 *   explicit comment on BacklogPage.atlaskit.tsx:1114–1118:
 *     "The page breadcrumb (ProjectHub / BAU) was removed as redundant —
 *      the top nav already shows location."
 *
 * Style values (measured from BacklogPage.atlaskit.tsx:1119-1123):
 *   container padding:   16px 16px 4px
 *   h1 font-size:        20px
 *   h1 font-weight:      600
 *   h1 color:            #172B4D   (Atlaskit 'color.text', light mode)
 *   h1 letter-spacing:  -0.003em
 *   h1 margin:           0
 *
 * Dark mode:
 *   Swaps to Catalyst's DARK MODE text token so contrast on #1A1A1A surface holds.
 *
 * Rollback:
 *   1. Restore the original breadcrumb/h1 JSX per page.
 *   2. Delete this file.
 */

import React, { ReactNode, useSyncExternalStore } from 'react';

function useIsDark(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => undefined;
      const obs = new MutationObserver(onChange);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => obs.disconnect();
    },
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'dark',
    () => false,
  );
}

interface HubPageHeaderProps {
  /** Page title. Plain string — no HTML. */
  title: string;
  /** Optional right-aligned actions (buttons, CTAs). */
  actions?: ReactNode;
  /** Override padding (default: 16px 16px 4px — from BAU backlog). */
  padding?: string;
  /** Extra class on the wrapper. */
  className?: string;
}

export function HubPageHeader({
  title,
  actions,
  padding = '16px 16px 4px',
  className,
}: HubPageHeaderProps) {
  const isDark = useIsDark();
  return (
    <div
      data-hub-page-header
      className={className}
      style={{
        padding,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 600,
          color: isDark ? '#EDEDED' : '#172B4D',
          letterSpacing: '-0.003em',
          fontFamily: '"Atlassian Sans", Inter, system-ui, -apple-system, sans-serif',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div> : null}
    </div>
  );
}

export default HubPageHeader;
