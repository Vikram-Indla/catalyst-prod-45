import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/* Inline SVG icons (16px) */
const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
);

const KanbanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="14" rx="1" />
    <rect x="10" y="3" width="5" height="10" rx="1" />
    <rect x="17" y="3" width="5" height="18" rx="1" />
  </svg>
);

const TimelineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h13M3 12h18M3 18h10" />
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const GearSmallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  hasChevron?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Product Backlog', path: '/producthub/backlog', icon: <TableIcon /> },
  { label: 'Product Kanban', path: '/producthub/kanban', icon: <KanbanIcon /> },
  { label: 'Product Roadmap', path: '/producthub/roadmap', icon: <TimelineIcon /> },
  
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/producthub/backlog') {
      return location.pathname === '/producthub/backlog' || location.pathname === '/producthub';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className="fixed top-14 left-0 bottom-0 w-60 z-40 flex flex-col"
      style={{
        background: 'var(--sidebar-bg, #FFFFFF)',
        borderRight: '1px solid var(--sidebar-border, #E2E8F0)',
        boxShadow: 'var(--sidebar-shadow, 1px 0 0 rgba(15, 23, 42, 0.06))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <span
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '14px',
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.3px',
          }}
        >
          Product Hub
        </span>
        <button
          className="flex items-center justify-center w-6 h-6 rounded transition-colors duration-100"
          style={{ color: '#94A3B8', background: 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#334155';
            e.currentTarget.style.background = 'var(--sidebar-item-hover-bg, #F1F5F9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94A3B8';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <CollapseIcon />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center relative transition-colors duration-100"
              style={{
                height: '36px',
                padding: '0 10px',
                gap: '10px',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--sidebar-item-active-text, #2563EB)' : 'var(--sidebar-item-text, #334155)',
                background: active ? 'var(--sidebar-item-active-bg, #EFF6FF)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--sidebar-item-hover-bg, #F1F5F9)';
                  e.currentTarget.style.color = '#0F172A';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = active ? 'var(--sidebar-item-active-bg, #EFF6FF)' : 'transparent';
                e.currentTarget.style.color = active ? 'var(--sidebar-item-active-text, #2563EB)' : 'var(--sidebar-item-text, #334155)';
              }}
            >
              {/* V11 Active accent bar */}
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '5px',
                    bottom: '5px',
                    width: '3px',
                    background: 'var(--sidebar-accent-bar, #2563EB)',
                    borderRadius: '0 3px 3px 0',
                  }}
                />
              )}
              <span
                className="shrink-0"
                style={{ opacity: active ? 1.0 : 0.65 }}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.hasChevron && (
                <span className="shrink-0" style={{ color: '#94A3B8' }}>
                  <ChevronRightIcon />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom settings */}
      <div
        style={{
          padding: '6px 8px',
          borderTop: '1px solid var(--sidebar-divider, #F1F5F9)',
        }}
      >
        <button
          className="flex items-center gap-2 transition-colors duration-100"
          style={{
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            color: 'var(--sidebar-item-text, #334155)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0 10px',
            height: '36px',
            borderRadius: '6px',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sidebar-item-hover-bg, #F1F5F9)';
            e.currentTarget.style.color = '#0F172A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--sidebar-item-text, #334155)';
          }}
        >
          <span style={{ opacity: 0.65 }}><GearSmallIcon /></span>
          Product Settings
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
