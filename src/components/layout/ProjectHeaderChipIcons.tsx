/**
 * ProjectHeaderChipIcons — small SVG icons sized for @atlaskit/icon-button.
 *
 * These match the Jira horizontal-nav-header glyphs probed in catalog
 * item 1. We hand-roll instead of pulling @atlaskit/icon glyphs because
 * the current Atlaskit icon set in this repo doesn't include all of
 * them, and lucide-react is banned inside hub scope. Each is a 16×16
 * Atlaskit-style line icon and accepts a label prop so it composes
 * with @atlaskit/button/new IconButton.
 */
import React from 'react';

interface IconProps {
  label?: string;
}

/* jira-compare 2026-05-02 — measured Jira chip icons:
     16×16 stroke, color rgb(80,82,88) = --ds-text-subtle.
   IconButton parent doesn't pass colour into custom icons, so the icon
   declares its own stroke explicitly to match Jira's subtle tone. */
const baseProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'var(--ds-text-subtle, #505258)',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export function PersonAddIcon(_: IconProps) {
  return (
    <svg {...baseProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export function ShareIcon(_: IconProps) {
  return (
    <svg {...baseProps}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function EditorMoreIcon(_: IconProps) {
  return (
    <svg {...baseProps}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function LightbulbIcon(_: IconProps) {
  return (
    <svg {...baseProps}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
    </svg>
  );
}

export function FeedbackIcon(_: IconProps) {
  return (
    <svg {...baseProps}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function ScreenfullIcon(_: IconProps) {
  return (
    <svg {...baseProps}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
