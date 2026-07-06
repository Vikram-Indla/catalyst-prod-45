import React from 'react';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import type { ChatView } from '../hooks/useShellState';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './app-rail.css';

interface AppRailProps {
  activeView: ChatView;
  onNavigate: (view: ChatView) => void;
  unreadDMs: number;
  unreadActivity: number;
  userName: string;
  userAvatarUrl: string | null;
}

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/>
  </svg>
);
const DMsIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5Z"/>
  </svg>
);
const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
  </svg>
);
const LaterIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>
  </svg>
);
const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
    <circle cx="10" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const NAV_ITEMS: { id: ChatView; label: string; Icon: React.FC }[] = [
  { id: 'chat',     label: 'Home',     Icon: HomeIcon },
  { id: 'dms',      label: 'DMs',      Icon: DMsIcon },
  { id: 'activity', label: 'Activity', Icon: ActivityIcon },
  { id: 'later',    label: 'Later',    Icon: LaterIcon },
  { id: 'people',   label: 'People',   Icon: PeopleIcon },
];

export function AppRail({
  activeView,
  onNavigate,
  unreadDMs,
  unreadActivity,
  userName,
  userAvatarUrl,
}: AppRailProps) {
  return (
    <nav className="c-rail" aria-label="App rail">
      <div className="c-rail__logo" aria-hidden="true">C</div>

      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const badge = id === 'dms' ? unreadDMs : id === 'activity' ? unreadActivity : 0;
        return (
          <button
            key={id}
            className="c-rail__btn"
            onClick={() => onNavigate(id)}
            aria-label={label}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon />
            <span className="c-rail__btn__label">{label}</span>
            {badge > 0 && (
              <span className="c-rail__badge" aria-label={`${badge} unread`}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        );
      })}

      <div className="c-rail__avatar-wrap">
        <CatalystAvatar src={userAvatarUrl ?? undefined} name={userName} size="small" />
      </div>
    </nav>
  );
}
