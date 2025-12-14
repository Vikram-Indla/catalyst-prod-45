import React, { CSSProperties } from 'react';

interface IconProps {
  className?: string;
  style?: CSSProperties;
}

export const StrategyRoomIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <circle cx="10" cy="10" r="7.5" />
    <circle cx="10" cy="10" r="2" />
    <line x1="10" y1="2.5" x2="10" y2="5" />
    <line x1="10" y1="15" x2="10" y2="17.5" />
    <line x1="2.5" y1="10" x2="5" y2="10" />
    <line x1="15" y1="10" x2="17.5" y2="10" />
  </svg>
);

export const StrategicSnapshotsIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
    <line x1="2.5" y1="8" x2="17.5" y2="8" />
    <line x1="7" y1="3.5" x2="7" y2="8" />
    <line x1="7" y1="11.5" x2="14" y2="11.5" />
    <line x1="7" y1="14" x2="12" y2="14" />
  </svg>
);

export const StrategicBacklogIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <rect x="3" y="2.5" width="14" height="4" rx="1" />
    <rect x="3" y="8" width="14" height="4" rx="1" />
    <rect x="3" y="13.5" width="14" height="4" rx="1" />
    <line x1="6" y1="4.5" x2="6" y2="4.5" strokeWidth="2" />
    <line x1="6" y1="10" x2="6" y2="10" strokeWidth="2" />
    <line x1="6" y1="15.5" x2="6" y2="15.5" strokeWidth="2" />
  </svg>
);

export const ObjectiveTreeIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <circle cx="10" cy="3.5" r="2" />
    <circle cx="5" cy="11" r="2" />
    <circle cx="15" cy="11" r="2" />
    <circle cx="3" cy="17" r="1.5" />
    <circle cx="7" cy="17" r="1.5" />
    <circle cx="13" cy="17" r="1.5" />
    <circle cx="17" cy="17" r="1.5" />
    <line x1="10" y1="5.5" x2="10" y2="7" />
    <line x1="10" y1="7" x2="5" y2="9" />
    <line x1="10" y1="7" x2="15" y2="9" />
    <line x1="5" y1="13" x2="3" y2="15.5" />
    <line x1="5" y1="13" x2="7" y2="15.5" />
    <line x1="15" y1="13" x2="13" y2="15.5" />
    <line x1="15" y1="13" x2="17" y2="15.5" />
  </svg>
);

export const RoadmapsIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <path d="M2.5 15 L6 8 L10 12 L14 5 L17.5 9" />
    <circle cx="2.5" cy="15" r="1.5" />
    <circle cx="6" cy="8" r="1.5" />
    <circle cx="10" cy="12" r="1.5" />
    <circle cx="14" cy="5" r="1.5" />
    <circle cx="17.5" cy="9" r="1.5" />
  </svg>
);

export const RisksIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <path d="M10 2 L17.5 17 L2.5 17 Z" />
    <line x1="10" y1="7" x2="10" y2="11" />
    <circle cx="10" cy="14" r="0.5" fill="currentColor" />
  </svg>
);

export const CapacityIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <path d="M3 14 A7 7 0 0 1 17 14" />
    <path d="M5 14 A5 5 0 0 1 15 14" />
    <line x1="10" y1="14" x2="13" y2="8" />
    <circle cx="10" cy="14" r="1.5" />
  </svg>
);

export const ReportsIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
    <rect x="3" y="2.5" width="14" height="15" rx="2" />
    <line x1="6" y1="14" x2="6" y2="11" />
    <line x1="10" y1="14" x2="10" y2="8" />
    <line x1="14" y1="14" x2="14" y2="6" />
  </svg>
);

// Map of icon IDs to components for easy lookup
export const ENTERPRISE_NAV_ICONS: Record<string, React.FC<IconProps>> = {
  'strategy-room': StrategyRoomIcon,
  'strategic-snapshots': StrategicSnapshotsIcon,
  'strategic-backlog': StrategicBacklogIcon,
  'objective-tree': ObjectiveTreeIcon,
  'roadmaps': RoadmapsIcon,
  'risks': RisksIcon,
  'capacity-planning': CapacityIcon,
  'reports': ReportsIcon,
};
