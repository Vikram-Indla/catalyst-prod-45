/**
 * IconRail — far-left icon rail for the full-screen chat workspace.
 * Slack-equivalent nav: Home, DMs, Activity, Later, More — vertical,
 * icon + 11px label, selected-state background, Activity unread badge.
 * Current user avatar pinned top, Caty AI pinned bottom.
 */
import React from 'react';

export type RailKey = 'home' | 'dms' | 'activity' | 'later' | 'people';

export interface IconRailProps {
  activeKey?: RailKey;
  onSelect?: (key: RailKey) => void;
  meInitials?: string;
  onOpenCaty?: () => void;
  /** Unread activity count — renders a badge on the Activity item when > 0. */
  activityCount?: number;
}

interface NavDef {
  key: RailKey;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavDef[] = [
  {
    key: 'home',
    label: 'Home',
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    key: 'dms',
    label: 'DMs',
    icon: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    ),
  },
  {
    key: 'activity',
    label: 'Activity',
    icon: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
  {
    key: 'later',
    label: 'Later',
    icon: (
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    ),
  },
  {
    key: 'people',
    label: 'People',
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
];

export function IconRail({
  activeKey = 'home',
  onSelect,
  meInitials = 'VI',
  onOpenCaty,
  activityCount = 0,
}: IconRailProps) {
  return (
    <div className="cc-rail">
      <div className="cc-av cc-av--green cc-rail__me">
        {meInitials}
        <span className="cc-dot cc-dot--green" />
      </div>
      <div className="cc-rail__list">
        {NAV.map(item => (
          <button
            key={item.key}
            type="button"
            className={`cc-navitem${activeKey === item.key ? ' is-active' : ''}`}
            aria-current={activeKey === item.key ? 'page' : undefined}
            onClick={() => onSelect?.(item.key)}
          >
            <span className="cc-navitem__iconwrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                {item.icon}
              </svg>
              {item.key === 'activity' && activityCount > 0 && (
                <span className="cc-navitem__badge" aria-label={`${activityCount} unread`}>
                  {activityCount > 99 ? '99+' : activityCount}
                </span>
              )}
            </span>
            <span className="cc-navitem__lbl">{item.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="cc-navitem cc-rail__caty"
        onClick={onOpenCaty}
        aria-label="Open Caty AI"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-icon-discovery, #6E5DC6)" strokeWidth={2}>
          <path d="M12 3l1.9 5.8L20 10l-5.1 1.9L12 18l-1.9-6.1L5 10l5.1-1.2z" />
        </svg>
        <span className="cc-navitem__lbl" style={{ color: 'var(--ds-text-discovery, #6E5DC6)' }}>
          Caty AI
        </span>
      </button>
    </div>
  );
}

export default IconRail;
