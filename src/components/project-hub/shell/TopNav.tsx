import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Bell, Settings, Search } from '@/lib/atlaskit-icons';
import { Logo } from '@/components/brand/Logo';
import { CurrentUserAvatar } from './CurrentUserAvatar';

const HUB_TABS = [
  { label: 'Home', path: '/for-you' },
  { label: 'StrategyHub', path: '/strategyhub' },
  { label: 'ProductHub', path: '/producthub' },
  { label: 'ProjectHub', path: '/project-hub' },
  { label: 'ReleaseHub', path: '/releasehub' },
  { label: 'TestHub', path: '/testhub' },
  { label: 'IncidentHub', path: '/release' },
  { label: 'Tasks', path: '/tasks' },
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
      className="flex items-center flex-shrink-0 bg-white dark:bg-[var(--ds-surface)] border-b border-[var(--ds-border,var(--cp-border, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))]"
      style={{
        height: 48,
        paddingLeft: 16,
        paddingRight: 16,
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/for-you')}
        className="flex items-center mr-6 flex-shrink-0"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        <Logo size="md" showWordmark={true} className="flex items-center gap-2" />
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
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--cp-blue)' : (isDark ? 'var(--ds-text-subtlest)' : 'var(--fg-2)'),
                fontFamily: 'var(--cp-font-body)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--cp-blue)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = isDark ? 'var(--ds-text, var(--cp-bg-neutral, var(--ds-background-neutral)))' : 'var(--cp-blue)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = isDark ? 'var(--ds-text-subtlest)' : 'var(--fg-2)'; }}
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
            color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            border: 'none',
            borderRadius: 6,
            fontSize: 'var(--ds-font-size-300)',
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
          className="flex items-center gap-2 rounded-md bg-[var(--ds-surface-sunken)] dark:bg-transparent border border-[var(--ds-border,var(--cp-border, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))]"
          style={{
            height: 32,
            padding: '0 10px',
            borderRadius: 6,
            minWidth: 180,
          }}
        >
          <Search size={14} className="text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] dark:text-[var(--ds-text-subtlest)]" strokeWidth={2} />
          <span className="text-[var(--fg-4)] dark:text-[var(--ds-text-subtlest)]" style={{ fontSize: 'var(--ds-font-size-200)', userSelect: 'none', whiteSpace: 'nowrap' }}>
            Search anything...
          </span>
          <kbd
            className="bg-white dark:bg-transparent border border-[var(--ds-border,var(--cp-border, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))] text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] dark:text-[var(--ds-text-subtlest)]"
            style={{
              fontSize: 'var(--ds-font-size-50)',
              fontWeight: 500,
              borderRadius: 4,
              padding: '0px 5px',
              lineHeight: '16px',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Bell */}
        <button
          className="flex items-center justify-center rounded-md transition-colors hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] dark:hover:bg-[var(--ds-surface-overlay)]"
          style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Notifications"
        >
          <Bell size={18} className="text-[var(--ds-text-subtlest,var(--cp-ink-3, var(--cp-text-secondary)))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]" strokeWidth={1.75} />
        </button>

        {/* Settings */}
        <button
          className="flex items-center justify-center rounded-md transition-colors hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] dark:hover:bg-[var(--ds-surface-overlay)]"
          style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Settings"
        >
          <Settings size={18} className="text-[var(--ds-text-subtlest,var(--cp-ink-3, var(--cp-text-secondary)))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]" strokeWidth={1.75} />
        </button>

        {/* Avatar */}
        <CurrentUserAvatar />
      </div>
    </header>
  );
}