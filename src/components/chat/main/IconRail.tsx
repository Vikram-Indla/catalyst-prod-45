/**
 * IconRail — 72px left rail. Slack-style nav: DMs / Channels / Threads /
 * Mentions / Saved, with the current user avatar at top and Caty AI pinned
 * to the bottom. Self-labelling icons, sentence-case labels.
 */
import React from 'react';

export type RailKey = 'dms' | 'channels' | 'threads' | 'mentions' | 'saved';

export interface IconRailProps {
  activeKey?: RailKey;
  onSelect?: (key: RailKey) => void;
  meInitials?: string;
  onOpenCaty?: () => void;
}

interface NavDef {
  key: RailKey;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavDef[] = [
  {
    key: 'dms',
    label: 'DMs',
    icon: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    ),
  },
  {
    key: 'channels',
    label: 'Channels',
    icon: (
      <>
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="10" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="14" y2="21" />
      </>
    ),
  },
  {
    key: 'threads',
    label: 'Threads',
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    ),
  },
  {
    key: 'mentions',
    label: 'Mentions',
    icon: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
  {
    key: 'saved',
    label: 'Saved',
    icon: (
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    ),
  },
];

export function IconRail({
  activeKey = 'dms',
  onSelect,
  meInitials = 'VI',
  onOpenCaty,
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {item.icon}
            </svg>
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
