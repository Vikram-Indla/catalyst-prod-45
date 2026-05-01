import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { KBPanel } from '@/components/kb/KBPanel';

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
  { label: 'Wiki', path: '/wiki' },
];

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [kbOpen, setKbOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/producthub') return location.pathname.startsWith('/producthub');
    if (path === '/planhub') return location.pathname.startsWith('/planhub');
    if (path === '/strategyhub') return location.pathname.startsWith('/strategyhub') || location.pathname.startsWith('/strategy');
    if (path === '/projecthub') return location.pathname.startsWith('/projecthub') || location.pathname.startsWith('/project-hub');
    if (path === '/wiki') return location.pathname.startsWith('/wiki');
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 48, zIndex: 50,
          background: 'var(--fg-1)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 0,
          fontFamily: 'var(--cp-font-body)',
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
            fontSize: 14, fontWeight: 700, color: 'var(--bg-app)',
            letterSpacing: '-0.02em',
          }}>
            Catalyst<span style={{ fontSize: 9, fontWeight: 400, verticalAlign: 'super', marginLeft: 1, opacity: 0.6 }}>™</span>
          </span>
        </button>

        {/* Separator */}
        <div style={{
          width: 1, height: 24, background: 'var(--ds-border-bold, var(--ds-border-bold, #454545))',
          marginRight: 16, flexShrink: 0,
        }} />

        {/* Hub tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%', flex: 1 }}>
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
                  color: active ? (tab.label === 'Wiki' ? 'var(--ds-text-brand, var(--ds-text-brand, #3B82F6))' : 'var(--ds-text-brand, var(--ds-text-brand, #60A5FA))') : 'rgba(255,255,255,0.55)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--cp-font-body)',
                  transition: 'color 100ms',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
              >
                {tab.label === 'Wiki' && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--ds-text-brand, var(--ds-text-brand, #3B82F6))',
                    marginInlineEnd: 4, flexShrink: 0,
                    animation: 'wiki-pulse 2s ease-in-out infinite',
                  }} />
                )}
                <span style={{ color: tab.label === 'Wiki' && active ? 'var(--ds-text-brand, var(--ds-text-brand, #3B82F6))' : undefined }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* KB trigger button */}
        <button
          onClick={() => setKbOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--cp-font-body)',
            background: kbOpen ? 'rgba(37,99,235,0.2)' : 'var(--ds-border, var(--ds-border, #2E2E2E))',
            color: kbOpen ? 'var(--ds-text-brand, var(--ds-text-brand, #60A5FA))' : 'rgba(255,255,255,0.65)',
            transition: 'all 150ms',
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (!kbOpen) e.currentTarget.style.background = 'var(--ds-border-bold, var(--ds-border-bold, #454545))'; }}
          onMouseLeave={e => { if (!kbOpen) e.currentTarget.style.background = 'var(--ds-border, var(--ds-border, #2E2E2E))'; }}
        >
          <BookOpen size={14} />
          KB
        </button>
      </header>

      {/* KB Panel */}
      <KBPanel isOpen={kbOpen} onClose={() => setKbOpen(false)} />
    </>
  );
}

export default TopNav;
