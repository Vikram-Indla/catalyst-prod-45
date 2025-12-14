import React, { CSSProperties } from 'react';

interface IconProps {
  className?: string;
  style?: CSSProperties;
}

export const ProductRoomIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <path d="M3 7.5 L10 3 L17 7.5 L10 12 Z" />
    <path d="M3 7.5 L3 13 L10 17.5 L10 12" />
    <path d="M17 7.5 L17 13 L10 17.5" />
    <path d="M10 12 L10 17.5" />
  </svg>
);

export const ProductBacklogIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <path d="M3 4.5 L6 4.5" />
    <path d="M8 4.5 L17 4.5" />
    <path d="M3 8.5 L6 8.5" />
    <path d="M8 8.5 L17 8.5" />
    <path d="M3 12.5 L6 12.5" />
    <path d="M8 12.5 L17 12.5" />
    <path d="M3 16.5 L6 16.5" />
    <path d="M8 16.5 L17 16.5" />
    <circle cx="4.5" cy="4.5" r="1.5" />
    <circle cx="4.5" cy="8.5" r="1.5" />
    <circle cx="4.5" cy="12.5" r="1.5" />
    <circle cx="4.5" cy="16.5" r="1.5" />
  </svg>
);

export const ProductKanbanIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <rect x="2.5" y="3" width="4" height="14" rx="1" />
    <rect x="8" y="3" width="4" height="10" rx="1" />
    <rect x="13.5" y="3" width="4" height="6" rx="1" />
  </svg>
);

export const ProductRoadmapIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <path d="M2.5 5 L17.5 5" />
    <path d="M2.5 10 L17.5 10" />
    <path d="M2.5 15 L17.5 15" />
    <rect x="4" y="3" width="5" height="4" rx="1" />
    <rect x="7" y="8" width="6" height="4" rx="1" />
    <rect x="11" y="13" width="5" height="4" rx="1" />
  </svg>
);

export const ProductCapacityIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <circle cx="7" cy="6" r="2.5" />
    <path d="M2.5 16 C2.5 12.5 4.5 11 7 11 C9.5 11 11.5 12.5 11.5 16" />
    <circle cx="14" cy="7" r="2" />
    <path d="M10.5 16 C10.5 13.5 12 12 14 12 C16 12 17.5 13.5 17.5 16" />
  </svg>
);

// Map of menu item titles to icon components
export const PRODUCT_ROOM_NAV_ICONS: Record<string, React.FC<IconProps>> = {
  'Product Room': ProductRoomIcon,
  'Product Backlog': ProductBacklogIcon,
  'Product Kanban': ProductKanbanIcon,
  'Product Roadmap': ProductRoadmapIcon,
  'Product Capacity': ProductCapacityIcon,
};
