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

  return (
    <header
      className="flex items-center flex-shrink-0"
      style={{
        height: 48,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        paddingLeft: 16,
        paddingRight: 16,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Logo — Catalyst™ */}
      <button
        onClick={() => navigate('/for-you')}
        className="flex items-center gap-1.5 mr-6 flex-shrink-0"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 28, height: 28, background: '#2563EB' }}
        >
          <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>C</span>
        </div>
        <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
          atalyst
          <span style={{ fontSize: 9, verticalAlign: 'super', color: '#94A3B8', fontWeight: 500 }}>™</span>
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
                color: isActive ? '#2563EB' : '#334155',
                fontFamily: "'Inter', sans-serif",
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#2563EB'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#334155'; }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {/* + Create — BLUE to match Catalyst */}
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 rounded-md transition-colors hover:opacity-90"
          style={{
            height: 32,
            padding: '0 12px',
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Create
        </button>

        {/* Search bar */}
        <div
          className="flex items-center gap-2 rounded-md"
          style={{
            height: 32,
            padding: '0 10px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            minWidth: 180,
          }}
        >
          <Search size={14} color="#94A3B8" strokeWidth={2} />
          <span style={{ fontSize: 12, color: '#94A3B8', userSelect: 'none', whiteSpace: 'nowrap' }}>
            Search anything...
          </span>
          <kbd
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#94A3B8',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
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
          className="flex items-center justify-center rounded-md transition-colors hover:bg-[#F1F5F9]"
          style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Notifications"
        >
          <Bell size={18} color="#64748B" strokeWidth={1.75} />
        </button>

        {/* Settings */}
        <button
          className="flex items-center justify-center rounded-md transition-colors hover:bg-[#F1F5F9]"
          style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Settings"
        >
          <Settings size={18} color="#64748B" strokeWidth={1.75} />
        </button>

        {/* Avatar */}
        <UserAvatar />
      </div>
    </header>
  );
}
