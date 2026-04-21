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
  | 'wiki';

interface HubIconProps {
  name: HubName;
  size?: number;
  className?: string;
}

/**
 * Atlaskit-fidelity hub icons for the Catalyst left rail.
 * Spec: 24x24 viewBox, 1.5px stroke, square linecap, rounded joins.
 * Colour is inherited via currentColor — the tile wrapper sets it.
 * Source: https://atlassian.design/foundations/iconography
 */
export const HubIcon: React.FC<HubIconProps> = ({ name, size = 24, className }) => {
  const common = {
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
      return (
        <svg {...common}>
          <path d="M3.25 11.25 12 4l8.75 7.25" />
          <path d="M5.25 10v9.25a.75.75 0 0 0 .75.75h12a.75.75 0 0 0 .75-.75V10" />
          <path d="M10.25 20v-4.25a1.75 1.75 0 0 1 3.5 0V20" />
        </svg>
      );
    case 'strategy':
      return (
        <svg {...common}>
          <path d="M3 20h18" />
          <rect x="4.5" y="13" width="4" height="7" rx="0.75" />
          <rect x="10" y="9" width="4" height="11" rx="0.75" />
          <rect x="15.5" y="5" width="4" height="15" rx="0.75" />
          <path d="M17.5 5V3l2 1-2 1" />
        </svg>
      );
    case 'product':
      return (
        <svg {...common}>
          <path d="M3 14h18" />
          <path d="M7 14V9" />
          <circle cx="7" cy="7.5" r="1.5" />
          <path d="M12 14v-2.5" />
          <circle cx="12" cy="10" r="1.5" />
          <path d="M17 14V6" />
          <circle cx="17" cy="4.5" r="1.5" />
          <path d="M7 17v1M12 17v1M17 17v1" />
        </svg>
      );
    case 'project':
      return (
        <svg {...common}>
          <path d="M3.75 7.5A1.25 1.25 0 0 1 5 6.25h3.5L10 7.75h9a1.25 1.25 0 0 1 1.25 1.25v9.75a1.25 1.25 0 0 1-1.25 1.25H5a1.25 1.25 0 0 1-1.25-1.25V7.5Z" />
          <path d="M8 12v5M12 11v6M16 12v5" />
        </svg>
      );
    case 'release':
      return (
        <svg {...common}>
          <rect x="3.5" y="7.5" width="17" height="12" rx="1" />
          <path d="M3.5 11h17" />
          <path d="M12 7.5v12" />
          <path d="M10 7.5V5.75A1.25 1.25 0 0 1 11.25 4.5h1.5A1.25 1.25 0 0 1 14 5.75V7.5" />
        </svg>
      );
    case 'test':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
          <path d="M8 12.25 11 15.25 16.25 9.25" />
        </svg>
      );
    case 'incident':
      return (
        <svg {...common}>
          <path d="M10.87 4.1a1.3 1.3 0 0 1 2.26 0l8 13.45a1.3 1.3 0 0 1-1.13 1.95H4a1.3 1.3 0 0 1-1.13-1.95l8-13.45Z" />
          <path d="M12 10v4" />
          <rect x="11.25" y="15.75" width="1.5" height="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'task':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
          <path d="M8 12.25 11 15.25 16.25 9.25" />
          <path d="M8 18h5" strokeOpacity="0.35" />
        </svg>
      );
    case 'plan':
      return (
        <svg {...common}>
          <rect x="3.5" y="5.25" width="17" height="15.25" rx="1.5" />
          <path d="M3.5 9.5h17" />
          <path d="M8 3.5v3.25M16 3.5v3.25" />
          <rect x="7.25" y="12.25" width="4.5" height="3" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="13" y="12.25" width="4" height="3" rx="0.5" />
          <path d="M7.5 18h3M13 18h3" strokeOpacity="0.55" />
        </svg>
      );
    case 'wiki':
      return (
        <svg {...common}>
          <path d="M3.5 5.25a.75.75 0 0 1 .75-.75h5.5A2.25 2.25 0 0 1 12 6.75v13.5a1.75 1.75 0 0 0-1.75-1.75h-6a.75.75 0 0 1-.75-.75V5.25Z" />
          <path d="M20.5 5.25a.75.75 0 0 0-.75-.75h-5.5A2.25 2.25 0 0 0 12 6.75v13.5a1.75 1.75 0 0 1 1.75-1.75h6a.75.75 0 0 0 .75-.75V5.25Z" />
          <path d="M6 8.75h3.25M6 11.25h3.25" />
          <path d="M14.75 8.75H18M14.75 11.25H18" />
        </svg>
      );
  }
};
