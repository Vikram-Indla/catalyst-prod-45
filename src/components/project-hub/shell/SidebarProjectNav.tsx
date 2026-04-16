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
  ChevronRight,
  Settings,
  ArrowLeft,
  Layers,
  LayoutList,
  BookOpen,
  Rocket,
  AlertTriangle,
  Tag,
  Network,
  Clock,
  X,
} from 'lucide-react';
import { NavItem } from './NavItem';
import { ProjectSwitcher, ProjectEntry } from './ProjectSwitcher';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRecentProjectItems, useRemoveRecentItem } from '@/hooks/useRecentProjectItems';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

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

const ITEM_TYPE_COLORS: Record<string, string> = {
  bug: '#FF5630', task: '#4BADE8', story: '#36B37E', epic: '#6554C0',
  subtask: '#2684FF', incident: '#FF5630', new_feature: '#36B37E', improvement: '#4BADE8',
};

function getTypeColor(type: string): string {
  const key = type.toLowerCase().replace(/[\s_-]/g, '');
  if (key.includes('bug')) return ITEM_TYPE_COLORS.bug;
  if (key.includes('story')) return ITEM_TYPE_COLORS.story;
  if (key.includes('epic')) return ITEM_TYPE_COLORS.epic;
  if (key.includes('incident')) return ITEM_TYPE_COLORS.incident;
  if (key.includes('feature')) return ITEM_TYPE_COLORS.new_feature;
  if (key.includes('improve')) return ITEM_TYPE_COLORS.improvement;
  if (key.includes('subtask')) return ITEM_TYPE_COLORS.subtask;
  return ITEM_TYPE_COLORS.task;
}

function formatTimeAgo(d: string): string {
  const diffMs = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

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
  const [recentsExpanded, setRecentsExpanded] = useState(true);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const basePath = `/project-hub/${projectKey}`;

  const isPathActive = (path: string) => {
    return location.pathname === `${basePath}/${path}` || location.pathname.startsWith(`${basePath}/${path}/`);
  };

  const { data: projectData } = useQuery({
    queryKey: ['ph-project-id', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_projects')
        .select('id')
        .eq('key', projectKey.toUpperCase())
        .maybeSingle();
      return data?.id || null;
    },
    staleTime: 300_000,
  });

  const { data: recentItems = [] } = useRecentProjectItems(projectData ?? undefined);
  const removeRecent = useRemoveRecentItem();

  const handleRecentClick = (item: typeof recentItems[0]) => {
    const { openDetail } = useGlobalSearchStore.getState();
    openDetail({
      id: item.issue_id,
      projectKey,
      itemType: item.issue_type,
    });
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
        <div className="flex items-center gap-2.5" style={{ padding: collapsed ? '12px 10px' : '12px 12px' }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 30, height: 30, backgroundColor: projectColor, color: '#FFFFFF',
              fontSize: 11, fontWeight: 700, borderRadius: 6,
              fontFamily: "'Sora', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
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
                  <div className="text-[#6B778C] dark:text-[#878787]" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>{projectKey}</div>
                  <div className="truncate text-[#172B4D] dark:text-[#EDEDED]" style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Sora', sans-serif", lineHeight: '18px' }}>
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

        <ProjectSwitcher
          projects={projects}
          currentKey={projectKey}
          isOpen={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          onSelect={(key) => { setSwitcherOpen(false); navigate(`/project-hub/${key}/dashboard`); }}
        />
      </div>

      {/* Back to all projects */}
      <div style={{ padding: '8px 8px 0' }}>
        <button
          onClick={() => navigate('/project-hub/projects')}
          className="flex items-center gap-2 w-full rounded-md transition-colors hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          style={{
            height: 32, padding: collapsed ? '0' : '0 12px',
            fontSize: 12.5, fontWeight: 500, border: 'none', background: 'transparent',
            cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start', color: '#6B778C',
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} className="text-[#6B778C] dark:text-[#878787]" />
          {!collapsed && <span className="dark:text-[#878787]">All Projects</span>}
        </button>
      </div>

      <div style={{ height: 1, background: '#EBECF0', margin: '8px 12px 4px' }} className="dark:bg-[#2E2E2E]" />

      {/* Project nav */}
      <div className="flex-1 py-1 overflow-y-auto" style={{ padding: '4px 6px' }}>
        {TOP_NAV.map(item => (
          <NavItem key={item.path} icon={item.icon} label={item.label} isActive={isPathActive(item.path)} collapsed={collapsed} onClick={() => navigate(`${basePath}/${item.path}`)} />
        ))}

        <div style={{ height: 1, background: '#EBECF0', margin: '8px 8px 6px' }} className="dark:bg-[#2E2E2E]" />

        {!collapsed && (
          <div className="dark:text-[#7D7D7D]" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 12px 6px', color: '#6B778C' }}>
            Planning
          </div>
        )}
        {PLANNING_NAV.map(item => (
          <NavItem key={item.path} icon={item.icon} label={item.label} isActive={isPathActive(item.path)} onClick={() => navigate(`${basePath}/${item.path}`)} collapsed={collapsed} />
        ))}

        <div style={{ height: 1, background: '#EBECF0', margin: '10px 8px 6px' }} className="dark:bg-[#2E2E2E]" />

        {!collapsed && (
          <div className="dark:text-[#7D7D7D]" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 12px 6px', color: '#6B778C' }}>
            Tracking
          </div>
        )}
        {TRACKING_NAV.map(item => (
          <NavItem key={item.path} icon={item.icon} label={item.label} isActive={isPathActive(item.path)} onClick={() => navigate(`${basePath}/${item.path}`)} collapsed={collapsed} />
        ))}

        <div style={{ height: 1, background: '#EBECF0', margin: '10px 8px 6px' }} className="dark:bg-[#2E2E2E]" />

        {!collapsed && (
          <div className="dark:text-[#7D7D7D]" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 12px 6px', color: '#6B778C' }}>
            AI Intelligence
          </div>
        )}
        <NavItem icon={Rocket} label="Release Predictor" isActive={isPathActive('sprint-predictor')} onClick={() => navigate(`${basePath}/sprint-predictor`)} collapsed={collapsed} badge="AI" />
        <NavItem icon={AlertTriangle} label="Risk Scanner" isActive={isPathActive('risk-scanner')} onClick={() => navigate(`${basePath}/risk-scanner`)} collapsed={collapsed} badge="AI" />

        {/* ═══ RECENTS SECTION ═══ */}
        {!collapsed && recentItems.length > 0 && (
          <>
            <div style={{ height: 1, background: '#EBECF0', margin: '10px 8px 6px' }} className="dark:bg-[#2E2E2E]" />

            <button
              onClick={() => setRecentsExpanded(p => !p)}
              className="flex items-center w-full"
              style={{ padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', gap: 4 }}
            >
              <ChevronRight
                size={12}
                className="text-[#6B778C] dark:text-[#7D7D7D]"
                style={{ transform: recentsExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}
              />
              <Clock size={12} className="text-[#6B778C] dark:text-[#7D7D7D]" />
              <span className="dark:text-[#7D7D7D]" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6B778C' }}>
                Recents
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: isDark ? '#7D7D7D' : '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                {recentItems.length}
              </span>
            </button>

            {recentsExpanded && (
              <div style={{ padding: '2px 0' }}>
                {recentItems.map(item => {
                  const typeColor = getTypeColor(item.issue_type);
                  return (
                    <div
                      key={item.id}
                      className="group"
                      style={{
                        display: 'flex', alignItems: 'center',
                        padding: '0 8px 0 12px', height: 32,
                        cursor: 'pointer', gap: 8,
                        borderRadius: '0 6px 6px 0',
                        borderLeft: '3px solid transparent',
                        transition: 'background 100ms ease',
                      }}
                      onClick={() => handleRecentClick(item)}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = isDark ? '#1F1F1F' : '#F4F5F7'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: typeColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: isDark ? '#A1A1A1' : '#42526E', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, letterSpacing: '-0.02em' }}>
                        {item.issue_key}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 400, color: isDark ? '#878787' : '#6B778C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                        {item.summary}
                      </span>
                      <span className="group-hover:hidden" style={{ fontSize: 10, fontWeight: 500, color: isDark ? '#7D7D7D' : '#94A3B8', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatTimeAgo(item.visited_at)}
                      </span>
                      <button
                        className="hidden group-hover:flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); removeRecent.mutate(item.id); }}
                        style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0, color: isDark ? '#878787' : '#6B778C' }}
                        title="Remove from recents"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings pinned to bottom */}
      <div className="border-t border-[#EBECF0] dark:border-[#2E2E2E]" style={{ padding: '8px 6px' }}>
        <NavItem icon={Settings} label="Settings" isActive={isPathActive('settings')} onClick={() => navigate(`${basePath}/settings`)} collapsed={collapsed} />
      </div>
    </div>
  );
}
