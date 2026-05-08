/**
 * HubIcon — bespoke 11-glyph hub icon set in Atlaskit visual language.
 *
 * 2026-05-08 (Step 7.1, council-pass v2):
 *   Hand-designed SVGs replacing the previous wrapper around stock
 *   @atlaskit/icon/glyph/* assets. Each glyph is custom for Catalyst's
 *   hub semantic — Strategy reads as "summit + flag", Ideation as
 *   "bulb + spark", Test as "beaker + check", etc. — but every glyph
 *   stays Atlaskit-canonical at the geometry level: 24x24 viewBox,
 *   1.5px stroke, square linecap, round linejoin, currentColor-driven.
 *
 * Color is inherited from the parent — the hub-tile wrapper sets it
 * via an ADS --ds-text-accent-* token. The SVG itself never hardcodes
 * a color, so the same glyph component renders correctly on every
 * surface (HubSwitcher tile, sidebar active row, breadcrumb dot, etc.).
 */
import React from 'react';

export type HubName =
  | 'home'
  | 'strategy'
  | 'product'
  | 'project'
  | 'release'
  | 'test'
  | 'incident'
  | 'task'
  | 'plan'
  | 'wiki'
  | 'ideation';

interface HubIconProps {
  name: HubName;
  size?: number;
  className?: string;
}

export const HubIcon: React.FC<HubIconProps> = ({ name, size = 24, className }) => {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false,
  };

  switch (name) {
    case 'home':
      // House with arched doorway — welcoming, not a generic roof glyph.
      return (
        <svg {...svgProps}>
          <path d="M3.5 11.5 12 4l8.5 7.5" />
          <path d="M5.25 10.25v9a.75.75 0 0 0 .75.75h12a.75.75 0 0 0 .75-.75v-9" />
          <path d="M9.75 20v-4a2.25 2.25 0 0 1 4.5 0v4" />
        </svg>
      );

    case 'strategy':
      // Mountain peak with summit flag — vision/objective, not a kanban board.
      return (
        <svg {...svgProps}>
          <path d="M3 19h18" />
          <path d="m4.5 19 5.25-9 3 5 2.25-3.5L20 19" />
          <path d="M14.75 7.5V3l4 1.5-4 1.5" />
        </svg>
      );

    case 'ideation':
      // Lightbulb with discovery spark — energy, not a static bulb.
      return (
        <svg {...svgProps}>
          <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.85.95.85 1.6V16h5.5v-.6c0-.65.35-1.2.85-1.6A6 6 0 0 0 12 3Z" />
          <path d="M9.25 18h5.5" />
          <path d="M10.25 20.75h3.5" />
          <path d="M19.25 5.25 20.75 3.75" strokeLinecap="round" />
          <path d="M21 9h1.5" strokeLinecap="round" />
        </svg>
      );

    case 'product':
      // Stacked layered cube — multi-faceted product, not a storefront.
      return (
        <svg {...svgProps}>
          <path d="M12 4.25 4.5 8.25v7.5L12 19.75l7.5-4V8.25Z" />
          <path d="m4.5 8.25 7.5 4 7.5-4" />
          <path d="M12 12.25v7.5" />
          <path d="m8.25 6.25 7.5 4" strokeOpacity="0.55" />
        </svg>
      );

    case 'project':
      // Kanban with three columns and a card — delivery in motion.
      return (
        <svg {...svgProps}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="1.25" />
          <path d="M9 4.5v15M15 4.5v15" />
          <rect x="4.75" y="6.75" width="3" height="4" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'release':
      // Rocket with thrust — launch, not a cargo ship.
      return (
        <svg {...svgProps}>
          <path d="M14.25 4.5c2.25 0 4.5 1.75 4.5 4.5 0 4-3 8-6.75 11.25C8.25 17 5.25 13 5.25 9c0-2.75 2.25-4.5 4.5-4.5C11.25 4.5 12 6 12 6s.75-1.5 2.25-1.5Z" />
          <circle cx="12" cy="10.25" r="1.5" />
          <path d="M9 18.5c-1.25 1-2.25 1.75-3 1.75.25-.75 1-1.75 2-3" />
          <path d="M15 18.5c1.25 1 2.25 1.75 3 1.75-.25-.75-1-1.75-2-3" />
        </svg>
      );

    case 'test':
      // Beaker with checkmark inside — QA, not a generic check-circle.
      return (
        <svg {...svgProps}>
          <path d="M9 3.25h6" strokeLinecap="round" />
          <path d="M9.75 3.25v6.5L4.5 17a2 2 0 0 0 1.65 3.15h11.7A2 2 0 0 0 19.5 17l-5.25-7.25v-6.5" />
          <path d="m9 14.75 2.25 2.25 4.25-4.25" strokeLinecap="round" />
        </svg>
      );

    case 'incident':
      // Alert triangle with lightning bolt inside — distinct from generic warning.
      return (
        <svg {...svgProps}>
          <path d="M10.87 4.1a1.3 1.3 0 0 1 2.26 0l8 13.45a1.3 1.3 0 0 1-1.13 1.95H4a1.3 1.3 0 0 1-1.13-1.95l8-13.45Z" />
          <path d="m12.75 8.5-2.5 4.5h2.25l-1 4 3-4.75H12.25l1.25-3.75Z" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'task':
      // Three-line checklist — list of items, not a single check.
      return (
        <svg {...svgProps}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
          <path d="m6.5 9 1.5 1.5L11 7.75" strokeLinecap="round" />
          <path d="M13.5 9.5h4.25" strokeLinecap="round" />
          <path d="m6.5 14 1.5 1.5L11 12.75" strokeLinecap="round" />
          <path d="M13.5 14.5h4.25" strokeLinecap="round" />
        </svg>
      );

    case 'plan':
      // Gantt-style stacked bars — time sequencing, not a calendar grid.
      return (
        <svg {...svgProps}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="1.25" />
          <rect x="6" y="7.5" width="7" height="2" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="9" y="11" width="9" height="2" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="6" y="14.5" width="5" height="2" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'wiki':
      // Open book with center binding and ribbon bookmark — knowledge anchor.
      return (
        <svg {...svgProps}>
          <path d="M3.5 5.25a.75.75 0 0 1 .75-.75h5A2.5 2.5 0 0 1 11.75 7v12.25a1.75 1.75 0 0 0-1.75-1.75H4.25a.75.75 0 0 1-.75-.75V5.25Z" />
          <path d="M20.5 5.25a.75.75 0 0 0-.75-.75h-5A2.5 2.5 0 0 0 12.25 7v12.25a1.75 1.75 0 0 1 1.75-1.75h5.75a.75.75 0 0 0 .75-.75V5.25Z" />
          <path d="M16.25 4.5v6l1.5-1 1.5 1v-6" strokeLinecap="round" />
        </svg>
      );
  }
};
