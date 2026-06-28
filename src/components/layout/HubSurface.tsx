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
 *     - Canvas bg:      var(--ds-background-selected)  (the light blue Jira uses — not var(--ds-surface-sunken))
 *     - Panel bg:       var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))
 *     - Frame padding:  24px
 *     - Panel radius:   8px
 *     - Panel border:   none
 *     - Panel shadow:   none (Jira's list view is flat on canvas)
 *
 * Dark mode:
 *   Falls back to Catalyst's --cp-bg-canvas and --cp-bg tokens so StrategyHub
 *   doesn't flash a light-blue surface on a black DARK MODE page.
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

import React, { ReactNode, CSSProperties } from 'react';

/* ─── Uniform surface (2026-06-18, Vikram) ────────────────────────────────
   Canvas + panel always track --cp-bg-elevated (= var(--ds-surface)
   in light, var(--ds-surface) in dark), so hub pages match the rest of the shell — one
   flat tone everywhere. Light: var(--ds-surface) (no regression). Dark: var(--ds-surface) (the
   grayish raised tone, spread uniformly). Replaces the broken
   data-theme==='dark' check.
   ──────────────────────────────────────────────────────────────────────── */
const SURFACE_BG = 'var(--cp-bg-elevated)';

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
  const canvasBg = SURFACE_BG;
  const panelBg  = SURFACE_BG;

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
          /* jira-compare 2026-05-05: overflow:clip instead of overflow:hidden.
             'clip' clips visually (preserves border-radius corners) but does NOT
             create a scroll container, which allows position:sticky on descendants
             (e.g. the right rail in CatalystViewBase fullPageMode) to propagate
             through to the page-level overflow-y:auto scroll container.
             overflow:hidden creates a stacking/scroll context that breaks sticky. */
          overflow: 'clip',
          ...panelStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default HubSurface;
