import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Columns3,
  AlignJustify,
  GanttChart,
  BarChart3,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { NavItem } from './NavItem';
import { ProjectSwitcher, ProjectEntry } from './ProjectSwitcher';

interface SidebarProjectNavProps {
  projectKey: string;
  projectName: string;
  projectColor: string;
  collapsed: boolean;
  onToggle: () => void;
  projects: ProjectEntry[];
}

const PROJECT_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
  { icon: List, label: 'Backlog', path: 'backlog' },
  { icon: Columns3, label: 'Board', path: 'board' },
  { icon: AlignJustify, label: 'List', path: 'list' },
  { icon: GanttChart, label: 'Timeline', path: 'timeline' },
  { icon: BarChart3, label: 'Reports', path: 'reports' },
];

export function SidebarProjectNav({
  projectKey,
  projectName,
  projectColor,
  collapsed,
  onToggle,
  projects,
}: SidebarProjectNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const basePath = `/project-hub/${projectKey}`;

  const isPathActive = (path: string) => {
    return location.pathname === `${basePath}/${path}` || location.pathname.startsWith(`${basePath}/${path}/`);
  };

  return (
    <div
      className="flex flex-col h-full flex-shrink-0"
      style={{
        width: collapsed ? 56 : 192,
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        transition: 'width 200ms ease',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
      }}
    >
      {/* Header with project switcher */}
      <div className="relative flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div
          className="flex items-center gap-2"
          style={{ padding: collapsed ? '12px 10px' : '12px 10px' }}
        >
          {/* Project icon */}
          <div
            className="flex items-center justify-center rounded flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              background: projectColor,
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 6,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {projectKey.slice(0, 2)}
          </div>

          {!collapsed && (
            <>
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                className="flex items-center gap-1 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
              >
                <div className="min-w-0">
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>{projectKey}</div>
                  <div
                    className="truncate"
                    style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}
                  >
                    {projectName}
                  </div>
                </div>
                <ChevronDown size={14} color="#94A3B8" className="flex-shrink-0" />
              </button>
              <button
                onClick={onToggle}
                className="flex items-center justify-center rounded hover:bg-[#F1F5F9] transition-colors flex-shrink-0"
                style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Collapse sidebar"
              >
                <ChevronsLeft size={16} color="#64748B" />
              </button>
            </>
          )}

          {collapsed && (
            <button
              onClick={onToggle}
              className="absolute top-2 right-1 flex items-center justify-center rounded hover:bg-[#F1F5F9]"
              style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <ChevronsRight size={14} color="#64748B" />
            </button>
          )}
        </div>

        {/* Project Switcher dropdown */}
        <ProjectSwitcher
          projects={projects}
          currentKey={projectKey}
          isOpen={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          onSelect={(key) => {
            setSwitcherOpen(false);
            navigate(`/project-hub/${key}/dashboard`);
          }}
        />
      </div>

      {/* Back to all projects */}
      <div className="px-1.5 pt-2">
        <button
          onClick={() => navigate('/project-hub/projects')}
          className="flex items-center gap-1.5 w-full rounded-md transition-colors hover:bg-[#F1F5F9]"
          style={{
            height: 30,
            padding: collapsed ? '0' : '0 10px',
            fontSize: 12,
            color: '#64748B',
            fontWeight: 500,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          title="All Projects"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          {!collapsed && <span>All Projects</span>}
        </button>
      </div>

      {/* Project nav */}
      <div className="flex-1 py-1 px-1.5 space-y-0.5 overflow-y-auto">
        {/* PROJECT section */}
        {!collapsed && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748B',
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              padding: '8px 10px 4px',
            }}
          >
            Project
          </div>
        )}
        {PROJECT_NAV.map(item => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isPathActive(item.path)}
            onClick={() => navigate(`${basePath}/${item.path}`)}
            collapsed={collapsed}
          />
        ))}

        {/* INTELLIGENCE section */}
        {!collapsed && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748B',
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              padding: '12px 10px 4px',
            }}
          >
            Intelligence
          </div>
        )}
        {/* AI Assist with badge */}
        <button
          onClick={() => navigate(`${basePath}/ai-assist`)}
          title={collapsed ? 'AI Assist' : undefined}
          className={`flex items-center w-full rounded-md transition-colors duration-150 text-[13px] font-medium ${
            collapsed ? 'justify-center px-0 h-[34px] w-[34px] mx-auto' : 'gap-[10px] px-[10px] h-[34px]'
          } ${isPathActive('ai-assist') ? 'font-semibold' : 'hover:bg-[#F1F5F9]'}`}
          style={{
            color: isPathActive('ai-assist') ? '#2563EB' : '#334155',
            background: isPathActive('ai-assist') ? '#EFF6FF' : undefined,
            borderLeft: isPathActive('ai-assist') && !collapsed ? '3px solid #2563EB' : '3px solid transparent',
            fontFamily: "'Inter', sans-serif",
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={20} strokeWidth={1.75} />
          {!collapsed && (
            <>
              <span className="truncate">AI Assist</span>
              <span
                className="ml-auto flex-shrink-0"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  background: '#2563EB',
                  borderRadius: 4,
                  padding: '1px 5px',
                  lineHeight: '14px',
                  letterSpacing: '0.03em',
                }}
              >
                AI
              </span>
            </>
          )}
        </button>
      </div>

      {/* Settings pinned to bottom */}
      <div style={{ borderTop: '1px solid #E2E8F0', padding: '8px 6px' }}>
        <NavItem
          icon={Settings}
          label="Settings"
          isActive={isPathActive('settings')}
          onClick={() => navigate(`${basePath}/settings`)}
          collapsed={collapsed}
        />
      </div>
    </div>
  );
}
