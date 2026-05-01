import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Bell, Settings, Search } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

const HUB_TABS = [
  { label: 'Home', path: '/for-you' },
  { label: 'StrategyHub', path: '/strategyhub' },
  { label: 'ProductHub', path: '/producthub' },
  { label: 'ProjectHub', path: '/project-hub' },
  { label: 'ReleaseHub', path: '/releasehub' },
  { label: 'TestHub', path: '/testhub' },
  { label: 'IncidentHub', path: '/release' },
  { label: 'TaskHub', path: '/taskhub' },
  { label: 'PlanHub', path: '/planhub' },
];

interface TopNavProps {
  onCreateClick?: () => void;
}

export function TopNav({ onCreateClick }: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <header
      className="flex items-center flex-shrink-0 bg-white dark:bg-[var(--ds-surface,var(--ds-surface, #0A0A0A))] border-b border-[var(--ds-border,var(--ds-border, #E2E8F0))] dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]"
      style={{
        height: 48,
        paddingLeft: 16,
        paddingRight: 16,
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* Logo — Catalyst™ */}
      <button
        onClick={() => navigate('/for-you')}
        className="flex items-center gap-1.5 mr-6 flex-shrink-0"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0 bg-[var(--cp-blue)]"
          style={{ width: 28, height: 28 }}
        >
          <span style={{ color: 'var(--bg-app)', fontSize: 13, fontWeight: 800, fontFamily: 'var(--cp-font-heading)' }}>C</span>
        </div>
        <span className="text-[var(--fg-1)] dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]" style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 15, fontWeight: 700 }}>
          atalyst
          <span className="text-[var(--fg-4)] dark:text-[#7D7D7D]" style={{ fontSize: 9, verticalAlign: 'super', fontWeight: 500 }}>™</span>
        </span>
      </button>

      {/* Hub Tabs */}
      <nav className="flex items-center h-full flex-1" style={{ gap: 4 }}>
        {HUB_TABS.map(tab => {
          const isActive = tab.label === 'ProjectHub'
            ? location.pathname.startsWith('/project-hub')
            : location.pathname.startsWith(tab.path);

          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className="relative flex items-center h-full transition-colors duration-150"
              style={{
                padding: '0 10px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--cp-blue)' : (isDark ? 'var(--ds-text-subtlest, var(--ds-text-subtlest, #A1A1A1))' : 'var(--fg-2)'),
                fontFamily: 'var(--cp-font-body)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--cp-blue)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = isDark ? 'var(--ds-text, var(--ds-text, #EDEDED))' : 'var(--cp-blue)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = isDark ? 'var(--ds-text-subtlest, var(--ds-text-subtlest, #A1A1A1))' : 'var(--fg-2)'; }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {/* + Create */}
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 rounded-md transition-colors hover:opacity-90 bg-[var(--cp-blue)]"
          style={{
            height: 32,
            padding: '8px 12px',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Create
        </button>

        {/* Search bar */}
        <div
          className="flex items-center gap-2 rounded-md bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F8FAFC))] dark:bg-transparent border border-[var(--ds-border,var(--ds-border, #E2E8F0))] dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]"
          style={{
            height: 32,
            padding: '0 10px',
            borderRadius: 6,
            minWidth: 180,
          }}
        >
          <Search size={14} className="text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))] dark:text-[#7D7D7D]" strokeWidth={2} />
          <span className="text-[var(--fg-4)] dark:text-[#7D7D7D]" style={{ fontSize: 12, userSelect: 'none', whiteSpace: 'nowrap' }}>
            Search anything...
          </span>
          <kbd
            className="bg-white dark:bg-transparent border border-[var(--ds-border,var(--ds-border, #E2E8F0))] dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))] dark:text-[#7D7D7D]"
            style={{
              fontSize: 10,
              fontWeight: 500,
              borderRadius: 4,
              padding: '1px 5px',
              lineHeight: '16px',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Bell */}
        <button
          className="flex items-center justify-center rounded-md transition-colors hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F1F5F9))] dark:hover:bg-[var(--ds-surface-overlay,var(--ds-surface-overlay, #1F1F1F))]"
          style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Notifications"
        >
          <Bell size={18} className="text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #64748B))] dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]" strokeWidth={1.75} />
        </button>

        {/* Settings */}
        <button
          className="flex items-center justify-center rounded-md transition-colors hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F1F5F9))] dark:hover:bg-[var(--ds-surface-overlay,var(--ds-surface-overlay, #1F1F1F))]"
          style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Settings"
        >
          <Settings size={18} className="text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #64748B))] dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]" strokeWidth={1.75} />
        </button>

        {/* Avatar */}
        <UserAvatar />
      </div>
    </header>
  );
}