import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'All Projects', path: '/projecthub' },
  { label: 'All Resources', path: '/project-hub/resources' },
  { label: 'Capacity Planning', path: '/project-hub/capacity' },
  { label: 'Timesheets', path: '/project-hub/timesheets' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/project-hub/resources') {
      return location.pathname.startsWith('/project-hub/resource');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      style={{
        position: 'fixed', top: 48, left: 0, bottom: 0,
        width: 220, zIndex: 40,
        background: 'var(--bg-app)',
        borderRight: '1px solid var(--divider)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        fontSize: 10.5, fontWeight: 700, color: 'var(--fg-4)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        PROJECTHUB
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center',
                height: 50, padding: '0 10px',
                borderRadius: 6, fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--cp-blue)' : 'var(--fg-3)',
                background: active ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))' : 'transparent',
                border: 'none', cursor: 'pointer',
                position: 'relative',
                textAlign: 'left', width: '100%',
                fontFamily: 'var(--cp-font-body)',
                transition: 'background 100ms, color 100ms',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))';
                  e.currentTarget.style.color = 'var(--fg-1, #0F172A)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = active ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))' : 'transparent';
                e.currentTarget.style.color = active ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))';
              }}
            >
              {/* Active accent bar on right */}
              {active && (
                <span style={{
                  position: 'absolute', right: 0, top: 5, bottom: 5,
                  width: 3, background: 'var(--cp-blue)',
                  borderRadius: '3px 0 0 3px',
                }} />
              )}
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
