import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, Zap, BookOpen, Target, Package, Wrench, CheckSquare, Landmark, Globe, BarChart3 } from 'lucide-react';

const WIKI_DOMAINS = [
  { code: 'D1', label: 'Platform Overview', slug: 'platform', icon: BookOpen, count: 0 },
  { code: 'D2', label: 'Strategy & Governance', slug: 'strategy', icon: Target, count: 0 },
  { code: 'D3', label: 'Product Management', slug: 'products', icon: Package, count: 0 },
  { code: 'D4', label: 'Project Execution', slug: 'projects', icon: Wrench, count: 0 },
  { code: 'D5', label: 'Quality & Testing', slug: 'quality', icon: CheckSquare, count: 0 },
  { code: 'D6', label: 'Ministry Services', slug: 'ministry', icon: Landmark, count: 0 },
  { code: 'D7', label: 'Senaei Platform', slug: 'senaei', icon: Globe, count: 0 },
  { code: 'D8', label: 'Analytics & Reporting', slug: 'analytics', icon: BarChart3, count: 0 },
];

interface WikiSidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export function WikiSidebar({ expanded, onToggle }: WikiSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const sidebarWidth = expanded ? 232 : 52;

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: expanded ? '7px 12px' : '7px 0',
    justifyContent: expanded ? 'flex-start' : 'center',
    borderRadius: 'var(--cp-radius-default)',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'var(--cp-font-body)',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--cp-primary-60)' : 'var(--cp-text-secondary)',
    background: active ? 'var(--cp-interact-selected)' : 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'start',
    transition: 'background 80ms',
    position: 'relative',
  });

  const domainBadgeStyle: React.CSSProperties = {
    fontFamily: 'var(--cp-font-mono)',
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 5px',
    borderRadius: 'var(--cp-radius-sm)',
    background: 'var(--cp-purple-5)',
    color: 'var(--cp-purple-60)',
    flexShrink: 0,
    letterSpacing: '0.02em',
  };

  const countBadgeStyle: React.CSSProperties = {
    fontFamily: 'var(--cp-font-mono)',
    fontSize: 10,
    color: 'var(--cp-text-muted)',
    marginInlineStart: 'auto',
    flexShrink: 0,
  };

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100%',
        background: 'var(--cp-bg-elevated)',
        borderInlineEnd: '1px solid var(--cp-border-default)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 150ms ease',
        overflow: 'hidden',
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded ? 'space-between' : 'center',
        padding: expanded ? '12px 12px 8px' : '12px 0 8px',
        borderBottom: '1px solid var(--cp-border-subtle)',
      }}>
        {expanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--cp-purple-60)',
              animation: 'wiki-pulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: 13,
              fontWeight: 650,
              color: 'var(--cp-text-primary)',
              letterSpacing: '-0.01em',
            }}>Wiki</span>
            <span style={{
              fontSize: 9,
              fontWeight: 500,
              color: 'var(--cp-purple-60)',
              background: 'var(--cp-purple-5)',
              padding: '1px 5px',
              borderRadius: 'var(--cp-radius-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>AI</span>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 'var(--cp-radius-sm)',
            color: 'var(--cp-text-tertiary)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {/* Home */}
        <button
          onClick={() => navigate('/wiki')}
          style={navItemStyle(isActive('/wiki'))}
          onMouseEnter={e => { if (!isActive('/wiki')) e.currentTarget.style.background = 'var(--cp-interact-hover)'; }}
          onMouseLeave={e => { if (!isActive('/wiki')) e.currentTarget.style.background = 'transparent'; }}
        >
          <Home size={16} />
          {expanded && <span>Home</span>}
        </button>

        {/* What's New */}
        <button
          onClick={() => navigate('/wiki/whats-new')}
          style={navItemStyle(isActive('/wiki/whats-new'))}
          onMouseEnter={e => { if (!isActive('/wiki/whats-new')) e.currentTarget.style.background = 'var(--cp-interact-hover)'; }}
          onMouseLeave={e => { if (!isActive('/wiki/whats-new')) e.currentTarget.style.background = 'transparent'; }}
        >
          <Zap size={16} />
          {expanded && <span>What's New</span>}
        </button>

        {/* Domains section label */}
        {expanded && (
          <div style={{
            fontSize: 10,
            fontWeight: 650,
            color: 'var(--cp-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '12px 12px 4px',
          }}>
            Domains
          </div>
        )}

        {/* Domain items */}
        {WIKI_DOMAINS.map(d => {
          const path = `/wiki/category/${d.slug}`;
          const active = location.pathname === path;
          const Icon = d.icon;
          return (
            <button
              key={d.code}
              onClick={() => navigate(path)}
              style={navItemStyle(active)}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cp-interact-hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {expanded ? (
                <>
                  <span style={domainBadgeStyle}>{d.code}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{d.label}</span>
                  <span style={countBadgeStyle}>{d.count}</span>
                </>
              ) : (
                <span style={{ ...domainBadgeStyle, fontSize: 9 }}>{d.code}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
