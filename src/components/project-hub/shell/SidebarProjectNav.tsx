import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Columns3,
  GanttChart,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Settings,
  ArrowLeft,
  Layers,
  LayoutList,
  BookOpen,
  Rocket,
  AlertTriangle,
  Tag,
  Network,
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

const TOP_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
];

const PLANNING_NAV = [
  { icon: List, label: 'Backlog', path: 'backlog' },
  { icon: Layers, label: 'Epic Backlog', path: 'epic-backlog' },
  { icon: LayoutList, label: 'Feature Backlog', path: 'feature-backlog' },
  { icon: BookOpen, label: 'Story Backlog', path: 'story-backlog' },
  { icon: Network, label: 'All Work', path: 'hierarchy/allwork' },
  { icon: Columns3, label: 'Boards', path: 'boards' },
  { icon: GanttChart, label: 'Timeline', path: 'timeline' },
];

const TRACKING_NAV = [
  { icon: BarChart3, label: 'Reports', path: 'reports' },
  { icon: Tag, label: 'Releases', path: 'releases' },
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
      className="flex flex-col h-full flex-shrink-0 bg-white dark:bg-[#0A0A0A] border-r border-[#E2E8F0] dark:border-[#2E2E2E]"
      style={{
        width: collapsed ? 56 : 220,
        transition: 'width 200ms ease',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
      }}
    >
      {/* Header */}
      <div className="relative flex-shrink-0 border-b border-[#EBECF0] dark:border-[#2E2E2E] flex flex-col justify-center" style={{ minHeight: 77 }}>
        <div
          className="flex items-center gap-2.5"
          style={{ padding: collapsed ? '12px 10px' : '12px 12px' }}
        >
          {/* Project icon */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              backgroundColor: projectColor,
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 6,
              fontFamily: "'Sora', sans-serif",
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
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
                  <div className="text-[#6B778C] dark:text-[#878787]" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' as const }}>{projectKey}</div>
                  <div
                    className="truncate text-[#172B4D] dark:text-[#EDEDED]"
                    style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Sora', sans-serif", lineHeight: '18px' }}
                  >
                    {projectName}
                  </div>
                </div>
                <ChevronDown size={14} className="flex-shrink-0 text-[#6B778C] dark:text-[#7D7D7D]" />
              </button>
              <button
                onClick={onToggle}
                className="flex items-center justify-center rounded-md hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition-colors flex-shrink-0"
                style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Collapse sidebar"
              >
                <ChevronsLeft size={16} className="text-[#0052CC] dark:text-[#4C9AFF]" />
              </button>
            </>
          )}

          {collapsed && (
            <button
              onClick={onToggle}
              className="absolute top-2 right-1 flex items-center justify-center rounded hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
              style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <ChevronsRight size={14} className="text-[#0052CC] dark:text-[#4C9AFF]" />
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
      <div style={{ padding: '8px 8px 0' }}>
        <button
          onClick={() => navigate('/project-hub/projects')}
          className="flex items-center gap-2 w-full rounded-md transition-colors hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          style={{
            height: 32,
            padding: collapsed ? '0' : '0 12px',
            fontSize: 12.5,
            fontWeight: 500,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: '#6B778C',
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} className="text-[#6B778C] dark:text-[#878787]" />
          {!collapsed && <span className="dark:text-[#878787]">All Projects</span>}
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#EBECF0', margin: '8px 12px 4px' }} className="dark:bg-[#2E2E2E]" />

      {/* Project nav */}
      <div className="flex-1 py-1 overflow-y-auto" style={{ padding: '4px 6px' }}>
        {TOP_NAV.map(item => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isPathActive(item.path)}
            collapsed={collapsed}
            onClick={() => navigate(`${basePath}/${item.path}`)}
          />
        ))}

        {/* Section divider */}
        <div style={{ height: 1, background: '#EBECF0', margin: '8px 8px 6px' }} className="dark:bg-[#2E2E2E]" />

        {!collapsed && (
          <div className="dark:text-[#7D7D7D]" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase' as const, padding: '6px 12px 6px',
            color: '#6B778C',
          }}>
            Planning
          </div>
        )}
        {PLANNING_NAV.map(item => (
          <NavItem key={item.path} icon={item.icon} label={item.label} isActive={isPathActive(item.path)} onClick={() => navigate(`${basePath}/${item.path}`)} collapsed={collapsed} />
        ))}

        {/* Section divider */}
        <div style={{ height: 1, background: '#EBECF0', margin: '10px 8px 6px' }} className="dark:bg-[#2E2E2E]" />

        {!collapsed && (
          <div className="dark:text-[#7D7D7D]" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase' as const, padding: '6px 12px 6px',
            color: '#6B778C',
          }}>
            Tracking
          </div>
        )}
        {TRACKING_NAV.map(item => (
          <NavItem key={item.path} icon={item.icon} label={item.label} isActive={isPathActive(item.path)} onClick={() => navigate(`${basePath}/${item.path}`)} collapsed={collapsed} />
        ))}

        {/* Section divider */}
        <div style={{ height: 1, background: '#EBECF0', margin: '10px 8px 6px' }} className="dark:bg-[#2E2E2E]" />

        {!collapsed && (
          <div className="dark:text-[#7D7D7D]" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase' as const, padding: '6px 12px 6px',
            color: '#6B778C',
          }}>
            AI Intelligence
          </div>
        )}
        <NavItem icon={Rocket} label="Release Predictor" isActive={isPathActive('sprint-predictor')} onClick={() => navigate(`${basePath}/sprint-predictor`)} collapsed={collapsed} badge="AI" />
        <NavItem icon={AlertTriangle} label="Risk Scanner" isActive={isPathActive('risk-scanner')} onClick={() => navigate(`${basePath}/risk-scanner`)} collapsed={collapsed} badge="AI" />
      </div>

      {/* Settings pinned to bottom */}
      <div className="border-t border-[#EBECF0] dark:border-[#2E2E2E]" style={{ padding: '8px 6px' }}>
        <NavItem icon={Settings} label="Settings" isActive={isPathActive('settings')} onClick={() => navigate(`${basePath}/settings`)} collapsed={collapsed} />
      </div>
    </div>
  );
}