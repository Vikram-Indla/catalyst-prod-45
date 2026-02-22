import { LayoutGrid, Star, ChevronsLeft, ChevronsRight, Users, FolderKanban } from 'lucide-react';
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
      className="flex flex-col h-full flex-shrink-0"
      style={{
        width: collapsed ? 56 : 192,
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        transition: 'width 200ms ease',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ padding: collapsed ? '12px 10px' : '12px 10px', borderBottom: '1px solid #E2E8F0' }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 28, height: 28, background: '#2563EB', color: '#FFFFFF', fontSize: 11, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}
        >
          PH
        </div>
        {!collapsed && (
          <span
            className="flex-1 truncate"
            style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}
          >
            ProjectHub
          </span>
        )}
        <button
          onClick={onToggle}
          className="flex items-center justify-center rounded hover:bg-[#F1F5F9] transition-colors flex-shrink-0"
          style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight size={16} color="#64748B" />
          ) : (
            <ChevronsLeft size={16} color="#64748B" />
          )}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
        <NavItem
          icon={LayoutGrid}
          label="All Projects"
          isActive={location.pathname === '/project-hub/projects' || location.pathname === '/project-hub'}
          onClick={() => navigate('/project-hub/projects')}
          collapsed={collapsed}
        />
        <NavItem
          icon={FolderKanban}
          label="All Projects v2"
          isActive={location.pathname === '/project/all-projects'}
          onClick={() => navigate('/project/all-projects')}
          collapsed={collapsed}
        />
        <NavItem
          icon={Users}
          label="Resource 360"
          isActive={location.pathname.startsWith('/project-hub/resource360')}
          onClick={() => navigate('/project-hub/resource360')}
          collapsed={collapsed}
        />

        {/* Favorites section */}
        {!collapsed && (
          <div className="pt-3">
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#64748B',
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
                padding: '0 10px 4px',
              }}
            >
              Favorites
            </div>
            <div
              className="flex items-center gap-2 px-[10px] py-2"
              style={{ fontSize: 12, color: '#94A3B8' }}
            >
              <Star size={14} />
              <span>No starred projects</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
