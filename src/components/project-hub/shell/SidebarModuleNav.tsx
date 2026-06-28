import { LayoutGrid, Star, ChevronsLeft, ChevronsRight, FolderKanban } from '@/lib/atlaskit-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavItem } from './NavItem';

interface SidebarModuleNavProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarModuleNav({ collapsed, onToggle }: SidebarModuleNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      role="navigation"
      aria-label="ProjectHub modules"
      className="flex flex-col h-full flex-shrink-0 bg-white dark:bg-[var(--ds-surface)] border-r border-[var(--ds-border,var(--cp-border, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))]"
      style={{
        width: collapsed ? 56 : 220,
        transition: 'width 200ms ease',
        fontFamily: 'var(--cp-font-body)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 flex-shrink-0 border-b border-[var(--ds-border,var(--cp-border, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))]"
        style={{ padding: '12px 10px' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 28, height: 28, backgroundColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', fontSize: 'var(--ds-font-size-100)', fontWeight: 700, fontFamily: 'var(--cp-font-heading)', borderRadius: 6 }}
        >
          PH
        </div>
        {!collapsed && (
          <span
            className="flex-1 truncate text-[var(--ds-text,var(--cp-ink-1, var(--cp-ink-1)))] dark:text-[var(--ds-text,var(--cp-bg-neutral))]"
            style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, fontFamily: 'var(--cp-font-heading)' }}
          >
            ProjectHub
          </span>
        )}
        <button
          onClick={onToggle}
          className="flex items-center justify-center rounded hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken))] dark:hover:bg-[var(--ds-surface-overlay)] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
          style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight size={16} className="text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-background-information-bold)]" />
          ) : (
            <ChevronsLeft size={16} className="text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-background-information-bold)]" />
          )}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
        <NavItem icon={LayoutGrid} label="All Projects" isActive={location.pathname === '/project-hub/projects' || location.pathname === '/project-hub'} onClick={() => navigate('/project-hub/projects')} collapsed={collapsed} />

        {/* Favorites section */}
        {!collapsed && (
          <>
            <div className="my-2 mx-2" style={{ height: 1, backgroundColor: 'var(--ds-border)' }} />
            <div className="pt-1">
              <div className="text-[var(--ds-text-subtlest,var(--cp-text-secondary))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]" style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '0 10px 4px' }}>
                Favorites
              </div>
              <div
                className="flex items-center gap-2 mx-2 my-1 rounded-[6px] border border-dashed border-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))] dark:border-[var(--ds-border-bold)]"
                style={{ padding: '8px 12px' }}
              >
                <Star size={14} className="text-[var(--ds-border)] dark:text-[var(--ds-text-subtlest)] flex-shrink-0" />
                <span className="text-[var(--ds-text-subtlest,var(--cp-text-secondary))] dark:text-[var(--ds-text-subtlest)]" style={{ fontSize: 'var(--ds-font-size-200)' }}>
                  Star projects for quick access
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
