import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Settings, LayoutGrid, Clock, AlignLeft, Users, Database, Activity } from 'lucide-react';
import '../../shared/tokens/workhub-tokens.css';

const navItems = [
  { label: 'Jira Connection', path: 'jira-connection', icon: Settings },
  { label: 'Hierarchy Mapping', path: 'hierarchy-mapping', icon: LayoutGrid },
  { label: 'Scheduling Rules', path: 'scheduling-rules', icon: Clock },
  { label: 'Status Mapping', path: 'status-mapping', icon: AlignLeft },
  { label: 'User Mapping', path: 'user-mapping', icon: Users },
  { label: 'Data Scope', path: 'data-scope', icon: Database },
  { label: 'Sync & Logs', path: 'sync-logs', icon: Activity },
];

export function WorkHubSettingsLayout() {
  const location = useLocation();
  // If at the root /admin/workhub, redirect to jira-connection
  const isRoot = location.pathname === '/admin/workhub' || location.pathname === '/admin/workhub/';

  if (isRoot) {
    return <Navigate to="jira-connection" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100%', fontFamily: 'var(--wh-fn)' }}>
      {/* Sidebar */}
      <nav style={{
        width: 240,
        flexShrink: 0,
        padding: '24px 16px',
        borderRight: '1px solid var(--wh-bdr)',
        background: 'var(--wh-bg)',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--wh-pri)',
          marginBottom: 16,
          paddingLeft: 12,
          fontFamily: 'var(--wh-fn)',
        }}>
          WorkHub Settings
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--wh-rad)',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--wh-pri)' : 'var(--wh-tx)',
                background: isActive ? 'var(--wh-pri-bg)' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
                fontFamily: 'var(--wh-fn)',
              })}
              onMouseEnter={(e) => {
                const t = e.currentTarget;
                if (!t.classList.contains('active')) {
                  t.style.background = 'var(--wh-sf)';
                }
              }}
              onMouseLeave={(e) => {
                const t = e.currentTarget;
                if (!t.classList.contains('active')) {
                  t.style.background = 'transparent';
                }
              }}
            >
              <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default WorkHubSettingsLayout;
