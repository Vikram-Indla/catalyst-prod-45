/**
 * nav-icons — custom SVG nav icons for project-hub and product-hub sidebars.
 *
 * All icons:
 *   - 24×24 viewBox, stroke="currentColor", fill="none"
 *   - Accept className + style so SidebarBase can pass h-[16px] w-[16px] + color/strokeWidth
 *   - Same icons for project and product hub (Vikram directive 2026-06-14)
 *
 * NavRoadmapIcon is defined but NOT wired in sidebars yet (Vikram: "store it, i will ask again").
 */

import React from 'react';

type NavIconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function NavDashboardIcon({ className, style }: NavIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <rect x="3" y="3" width="7" height="9" rx="1.4" />
      <rect x="14" y="3" width="7" height="5" rx="1.4" />
      <rect x="14" y="12" width="7" height="9" rx="1.4" />
      <rect x="3" y="16" width="7" height="5" rx="1.4" />
    </svg>
  );
}

export function NavKanbanIcon({ className, style }: NavIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M8 8v8" />
      <path d="M12 8v5" />
      <path d="M16 8v3" />
    </svg>
  );
}

export function NavBacklogIcon({ className, style }: NavIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <circle cx="4.5" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9 6.5h11" />
      <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9 12h11" />
      <circle cx="4.5" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9 17.5h11" />
    </svg>
  );
}

export function NavWorkIcon({ className, style }: NavIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <rect x="2.5" y="7" width="19" height="13.5" rx="2.5" />
      <path d="M16 7V5.5A2.5 2.5 0 0 0 13.5 3h-3A2.5 2.5 0 0 0 8 5.5V7" />
      <path d="M2.5 12.5h19" />
      <rect x="10.4" y="11.1" width="3.2" height="2.8" rx="0.7" />
    </svg>
  );
}

export function NavFiltersIcon({ className, style }: NavIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <path d="M21 4H3l7 8.2V19l4 2v-8.8L21 4Z" />
    </svg>
  );
}

export function NavTimelineIcon({ className, style }: NavIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <path d="M4 4v16" />
      <path d="M8 7.5h10" />
      <path d="M6.5 12h7" />
      <path d="M10 16.5h8" />
    </svg>
  );
}

/** Stored — not wired in sidebars yet. Vikram: "i will ask again". */
export function NavRoadmapIcon({ className, style }: NavIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <path d="M7.2 21 10.7 4" />
      <path d="M16.8 21 13.3 4" />
      <path d="M12 20.5V5" strokeDasharray="2.4 2.6" />
    </svg>
  );
}
