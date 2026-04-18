/**
 * HubSurface — Jira/Atlaskit-style tinted canvas with a white content panel.
 *
 * Purpose (Decision A, Apr 2026):
 *   Demo the blue-canvas + white-panel surface pattern on a single hub landing
 *   (StrategyHub first) without touching CatalystShell.tsx or pulling in any
 *   @atlaskit/* runtime. Self-contained wrapper = trivial rollback (delete
 *   the import + unwrap).
 *
 * Visuals (light mode — match BAU backlog exactly):
 *   Values taken verbatim from BacklogPage.atlaskit.tsx:1083–1112, which the
 *   team measured from Jira's live DOM on 2026-04-18:
 *     - Canvas bg:      #E9F2FE  (the light blue Jira uses — not #F7F8F9)
 *     - Panel bg:       #FFFFFF
 *     - Frame padding:  24px
 *     - Panel radius:   8px
 *     - Panel border:   none
 *     - Panel shadow:   none (Jira's list view is flat on canvas)
 *
 * Dark mode:
 *   Falls back to Catalyst's --cp-bg-canvas and --cp-bg tokens so StrategyHub
 *   doesn't flash a light-blue surface on a black NOCTURNE page.
 *
 * Scope:
 *   - Use inside hub landing pages (StrategyHub, ProductHub, ProjectHub,
 *     TaskHub). Do NOT wrap /for-you or Home.
 *   - Pages that already have their own full-bleed card system (e.g. the
 *     Atlaskit backlog page itself) do NOT need this wrapper.
 *
 * Rollback:
 *   1. Remove <HubSurface> wrapper from the consumer page.
 *   2. Delete this file.
 */

import React, { ReactNode, CSSProperties, useSyncExternalStore } from 'react';

/* ─── Light-mode hex (Jira DOM measurement) ───────────────────────────── */
const JIRA_CANVAS = '#E9F2FE';   // light blue page bg
const JIRA_PANEL  = '#FFFFFF';   // white content card

/**
 * Observe <html data-theme="..."> so the wrapper flips to Catalyst's dark
 * tokens when the user toggles NOCTURNE. Uses useSyncExternalStore so we
 * stay in sync with the actual attribute on document.documentElement
 * without reaching for a theme context.
 */
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

interface HubSurfaceProps {
  children: ReactNode;
  /** Extra class on the OUTER canvas layer (rarely needed). */
  className?: string;
  /** Extra inline styles on the INNER panel (for overrides). */
  panelStyle?: CSSProperties;
  /**
   * Padding on the outer canvas layer — controls how much canvas is visible
   * as the frame around the white panel. Default 24 matches BAU backlog.
   */
  framePadding?: number | string;
  /**
   * Padding INSIDE the white panel. Set to 0 if the child handles its own
   * padding (e.g. a dashboard with its own header/gutter system).
   */
  panelPadding?: number | string;
}

export function HubSurface({
  children,
  className,
  panelStyle,
  framePadding = 24,
  panelPadding = 24,
}: HubSurfaceProps) {
  const isDark = useIsDark();

  // In dark mode, fall back to Catalyst's NOCTURNE tokens so this wrapper
  // doesn't punch a light-blue hole through a black page.
  const canvasBg = isDark ? 'var(--cp-bg-canvas)' : JIRA_CANVAS;
  const panelBg  = isDark ? 'var(--cp-bg)'        : JIRA_PANEL;

  return (
    <div
      data-hub-surface
      className={className}
      style={{
        background: canvasBg,
        padding: typeof framePadding === 'number' ? `${framePadding}px` : framePadding,
        minHeight: '100%',
        width: '100%',
      }}
    >
      <div
        data-hub-panel
        style={{
          background: panelBg,
          borderRadius: '8px',
          padding: typeof panelPadding === 'number' ? `${panelPadding}px` : panelPadding,
          minHeight: 'calc(100% - 2px)',
          overflow: 'hidden',
          ...panelStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default HubSurface;
