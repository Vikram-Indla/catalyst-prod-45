import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Bell, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { HubTab } from './HubTab';
import { SearchBar } from './SearchBar';
import { UserAvatar } from './UserAvatar';

const HUB_TABS = [
  { label: 'Home', path: '/for-you' },
  { label: 'Strategy', path: '/strategyhub' },
  { label: 'Product', path: '/producthub' },
  { label: 'Project', path: '/project-hub' },
  { label: 'Release', path: '/releasehub' },
  { label: 'Incident', path: '/release' },
  { label: 'Test', path: '/testhub' },
  { label: 'Task', path: '/taskhub' },
  { label: 'Plan', path: '/planhub' },
];

interface TopNavProps {
  onCreateClick?: () => void;
}

export function TopNav({ onCreateClick }: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tab: typeof HUB_TABS[number]) => {
    navigate(tab.path);
  };

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
      {/* Logo */}
      <button
        onClick={() => navigate('/for-you')}
        className="flex items-center gap-2 mr-6 flex-shrink-0"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 28, height: 28, background: '#2563EB' }}
        >
          <span style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>C</span>
        </div>
        <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
          Cata<span style={{ color: '#2563EB' }}>lyst</span>
          <span style={{ fontSize: 9, verticalAlign: 'super', color: '#94A3B8', fontWeight: 500 }}>™</span>
        </span>
      </button>

      {/* Hub Tabs */}
      <nav className="flex items-center h-full flex-1 gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {HUB_TABS.map(tab => (
          <HubTab
            key={tab.label}
            label={tab.label}
            isActive={
              tab.label === 'Project'
                ? location.pathname.startsWith('/project-hub')
                : location.pathname.startsWith(tab.path)
            }
            onClick={() => handleTabClick(tab)}
          />
        ))}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {/* + Create */}
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 rounded-md transition-colors hover:opacity-90"
          style={{
            height: 32,
            padding: '0 12px',
            background: '#16A34A',
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

        {/* Search */}
        <SearchBar />

        {/* Avatar */}
        <UserAvatar />
      </div>
    </header>
  );
}
