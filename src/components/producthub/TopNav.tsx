import { useNavigate, useLocation } from 'react-router-dom';

const HUB_TABS = [
  { label: 'Home', path: '/for-you' },
  { label: 'StrategyHub', path: '/strategyhub' },
  { label: 'ProductHub', path: '/producthub' },
  { label: 'ProjectHub', path: '/projecthub' },
  { label: 'ReleaseHub', path: '/releases' },
  { label: 'TestHub', path: '/testhub' },
  { label: 'IncidentHub', path: '/incident' },
  { label: 'TaskHub', path: '/planner' },
  { label: 'PlanHub', path: '/planhub' },
];

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/producthub') return location.pathname.startsWith('/producthub');
    if (path === '/planhub') return location.pathname.startsWith('/planhub');
    if (path === '/strategyhub') return location.pathname.startsWith('/strategyhub') || location.pathname.startsWith('/strategy');
    if (path === '/projecthub') return location.pathname.startsWith('/projecthub') || location.pathname.startsWith('/project-hub');
    return location.pathname.startsWith(path);
  };

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 48, zIndex: 50,
        background: '#0F172A',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 0,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/for-you')}
        style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginRight: 16, flexShrink: 0,
        }}
      >
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#FFFFFF',
          letterSpacing: '-0.02em',
        }}>
          Catalyst<span style={{ fontSize: 9, fontWeight: 400, verticalAlign: 'super', marginLeft: 1, opacity: 0.6 }}>™</span>
        </span>
      </button>

      {/* Separator */}
      <div style={{
        width: 1, height: 24, background: 'rgba(255,255,255,0.15)',
        marginRight: 16, flexShrink: 0,
      }} />

      {/* Hub tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
        {HUB_TABS.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                height: '100%', display: 'flex', alignItems: 'center',
                padding: '0 10px', fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? '#60A5FA' : 'rgba(255,255,255,0.55)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'color 100ms',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

export default TopNav;
