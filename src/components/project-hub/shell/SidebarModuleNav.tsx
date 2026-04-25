import { LayoutGrid, Star, ChevronsLeft, ChevronsRight, Users, FolderKanban, BarChart3, Calendar, FileText, Clock } from 'lucide-react';
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
      className="flex flex-col h-full flex-shrink-0 bg-white dark:bg-[#0A0A0A] border-r border-[#E2E8F0] dark:border-[#2E2E2E]"
      style={{
        width: collapsed ? 56 : 220,
        transition: 'width 200ms ease',
        fontFamily: 'var(--ds-font-family-body)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 flex-shrink-0 border-b border-[#E2E8F0] dark:border-[#2E2E2E]"
        style={{ padding: '12px 10px' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 28, height: 28, backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: 11, fontWeight: 700, fontFamily: 'var(--ds-font-family-heading)', borderRadius: 6 }}
        >
          PH
        </div>
        {!collapsed && (
          <span
            className="flex-1 truncate text-[#0F172A] dark:text-[#EDEDED]"
            style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--ds-font-family-heading)' }}
          >
            ProjectHub
          </span>
        )}
        <button
          onClick={onToggle}
          className="flex items-center justify-center rounded hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight size={16} className="text-[#2563EB] dark:text-[#4C9AFF]" />
          ) : (
            <ChevronsLeft size={16} className="text-[#2563EB] dark:text-[#4C9AFF]" />
          )}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
        <NavItem icon={LayoutGrid} label="All Projects" isActive={location.pathname === '/project-hub/projects' || location.pathname === '/project-hub'} onClick={() => navigate('/project-hub/projects')} collapsed={collapsed} />

        {/* Resource 360° Section */}
        {!collapsed && (
          <>
            <div className="my-2 mx-2" style={{ height: 1, backgroundColor: '#EBECF0' }} />
            <div className="pt-1 pb-1">
              <div className="text-[#6B778C] dark:text-[#878787]" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '0 10px 4px' }}>
                Resource 360°
              </div>
            </div>
          </>
        )}
        <NavItem icon={LayoutGrid} label="Dashboard" isActive={location.pathname === '/resource360' || location.pathname === '/project-hub/resource360'} onClick={() => navigate('/project-hub/resource360')} collapsed={collapsed} />
        <NavItem icon={Users} label="Resource 360™" isActive={location.pathname.startsWith('/project-hub/resources')} onClick={() => navigate('/project-hub/resources')} collapsed={collapsed} />
        <NavItem icon={BarChart3} label="Workload" isActive={location.pathname.startsWith('/resource360/workload')} onClick={() => navigate('/resource360/workload')} collapsed={collapsed} />
        <NavItem icon={Calendar} label="Capacity" isActive={location.pathname.startsWith('/resource360/capacity')} onClick={() => navigate('/resource360/capacity')} collapsed={collapsed} />
        <NavItem icon={FileText} label="Reports" isActive={location.pathname.startsWith('/resource360/reports')} onClick={() => navigate('/resource360/reports')} collapsed={collapsed} />
        <NavItem icon={Clock} label="Timesheet" isActive={location.pathname.startsWith('/resource360/timesheet')} onClick={() => navigate('/resource360/timesheet')} collapsed={collapsed} />

        {/* Favorites section */}
        {!collapsed && (
          <>
            <div className="my-2 mx-2" style={{ height: 1, backgroundColor: '#EBECF0' }} />
            <div className="pt-1">
              <div className="text-[#6B778C] dark:text-[#878787]" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '0 10px 4px' }}>
                Favorites
              </div>
              <div
                className="flex items-center gap-2 mx-2 my-1 rounded-[6px] border border-dashed border-[#DFE1E6] dark:border-[#454545]"
                style={{ padding: '10px 12px' }}
              >
                <Star size={14} className="text-[#C1C7D0] dark:text-[#7D7D7D] flex-shrink-0" />
                <span className="text-[#6B778C] dark:text-[#7D7D7D]" style={{ fontSize: 12 }}>
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
