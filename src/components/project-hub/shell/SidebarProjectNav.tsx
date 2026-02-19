import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Columns3,
  AlignJustify,
  GanttChart,
  Tag,
  BarChart3,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Settings,
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
  { icon: Tag, label: 'Releases', path: 'releases' },
  { icon: BarChart3, label: 'Reports', path: 'reports' },
];

const INTELLIGENCE_NAV = [
  { icon: Sparkles, label: 'AI Assist', path: 'ai-assist' },
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
        width: collapsed ? 48 : 192,
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        transition: 'width 200ms ease',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Header with project switcher */}
      <div className="relative flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div
          className="flex items-center gap-2"
          style={{ padding: collapsed ? '12px 7px' : '12px 10px' }}
        >
          {/* Project icon */}
          <div
            className="flex items-center justify-center rounded flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              background: projectColor,
              color: '#FFFFFF',
              fontSize: 11,
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

      {/* Project nav */}
      <div className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
        {/* PROJECT section */}
        {!collapsed && (
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
            className="pt-3"
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
        {INTELLIGENCE_NAV.map(item => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isPathActive(item.path)}
            onClick={() => navigate(`${basePath}/${item.path}`)}
            collapsed={collapsed}
          />
        ))}
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
