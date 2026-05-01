import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  LayoutDashboard,
  List,
  Map,
  Target,
  Users as UsersIcon,
  Calendar,
  TrendingUp,
  Menu,
  ChevronDown,
  Network,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TeamRoomSidebarProps {
  teamId: string;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  expandable?: boolean;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { id: 'room', label: 'Team Room', icon: LayoutDashboard, path: '/team/:teamId/room' },
  { id: 'backlog', label: 'Backlog', icon: List, path: '/team/:teamId/backlog' },
  { id: 'stories', label: 'Stories', icon: List, path: '/team/:teamId/stories' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/team/:teamId/roadmaps' },
  { id: 'objective-tree', label: 'Objective tree (OKR hub)', icon: Target, path: '/team/:teamId/objective-tree' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/team/:teamId/work-tree' },
  { id: 'team-meetings', label: 'Team meetings', icon: Calendar, path: '/team/:teamId/meetings' },
  { id: 'more-items', label: 'More items', icon: Menu, path: '#', expandable: true },
  { id: 'reports', label: 'Reports', icon: TrendingUp, path: '#', expandable: true },
  { id: 'more-pages', label: 'More pages', icon: Menu, path: '#', expandable: true },
];

// More items submenu
const moreItemsSubMenu = [
  { id: 'assign-tasks', label: 'Assign tasks', path: '/team/:teamId/assign-tasks' },
  { id: 'defects', label: 'Defects', path: '/team/:teamId/defects' },
  { id: 'dependencies', label: 'Dependencies', path: '/team/:teamId/dependencies' },
  { id: 'design-components', label: 'Design components', path: '/team/:teamId/design-components' },
  { id: 'estimation', label: 'Estimation', path: '/team/:teamId/estimation' },
  { id: 'impediments', label: 'Impediments', path: '/team/:teamId/impediments' },
  { id: 'kanban-boards', label: 'Kanban boards', path: '/team/:teamId/kanban-boards' },
  { id: 'sprints', label: 'Releases', path: '/team/:teamId/sprints' },
  { id: 'tasks', label: 'Tasks', path: '/team/:teamId/tasks' },
  { id: 'team-objectives', label: 'Team objectives', path: '/team/:teamId/objectives' },
  { id: 'teams', label: 'Teams', path: '/team/:teamId/teams' },
];

// Reports submenu
const reportsSubMenu = [
  { id: 'assessment-report', label: 'Assessment report', path: '/team/:teamId/reports/assessment' },
  { id: 'assessment-results', label: 'Assessment results', path: '/team/:teamId/reports/assessment-results' },
  { id: 'burndowns', label: 'Burndowns', path: '/team/:teamId/reports/burndowns' },
  { id: 'capacity-planning', label: 'Capacity planning', path: '/team/:teamId/reports/capacity-planning' },
  { id: 'cumulative-effort', label: 'Cumulative effort', path: '/team/:teamId/reports/cumulative-effort' },
  { id: 'dependency-maps', label: 'Dependency maps', path: '/team/:teamId/reports/dependency-maps' },
  { id: 'detailed-sprint-progress', label: 'Detailed release progress', path: '/team/:teamId/reports/detailed-sprint-progress' },
  { id: 'external-reports', label: 'External reports', path: '/team/:teamId/reports/external' },
  { id: 'impediments-risks', label: 'Impediments & risks', path: '/team/:teamId/reports/impediments-risks' },
  { id: 'organizational-hierarchy', label: 'Organizational hierarchy', path: '/team/:teamId/reports/organizational-hierarchy' },
  { id: 'risk-impediment-status', label: 'Risk and impediment status', path: '/team/:teamId/reports/risk-impediment-status' },
  { id: 'sprint-coaching', label: 'Release coaching', path: '/team/:teamId/reports/sprint-coaching' },
  { id: 'sprint-health', label: 'Release health', path: '/team/:teamId/reports/sprint-health' },
  { id: 'sprint-metrics', label: 'Release metrics (M1)', path: '/team/:teamId/reports/sprint-metrics' },
  { id: 'sprint-performance', label: 'Release performance', path: '/team/:teamId/reports/sprint-performance' },
  { id: 'sprint-planning', label: 'Release planning', path: '/team/:teamId/reports/sprint-planning' },
  { id: 'sprint-review', label: 'Release review', path: '/team/:teamId/reports/sprint-review' },
  { id: 'sprint-scope-changes', label: 'Release scope changes', path: '/team/:teamId/reports/sprint-scope-changes' },
  { id: 'sprint-status', label: 'Release status', path: '/team/:teamId/reports/sprint-status' },
  { id: 'stories-by-state', label: 'Stories by state', path: '/team/:teamId/reports/stories-by-state' },
  { id: 'story-point-progress', label: 'Story point progress by team', path: '/team/:teamId/reports/story-point-progress' },
  { id: 'team-velocity-trend', label: 'Detailed team velocity (trend)', path: '/team/:teamId/reports/team-velocity-trend' },
  { id: 'work-tree', label: 'Work tree', path: '/team/:teamId/reports/work-tree' },
];

// More pages submenu
const morePagesSubMenu = [
  { id: 'knowledge-hub', label: 'Knowledge Hub', path: '/knowledge-hub' },
  { id: 'assessments', label: 'Assessments', path: '/team/:teamId/pages/assessments' },
  { id: 'definition-of-done', label: 'Definition of done', path: '/team/:teamId/pages/definition-of-done' },
  { id: 'lean-process', label: 'Lean process', path: '/team/:teamId/pages/lean-process' },
  { id: 'retrospectives', label: 'Retrospectives', path: '/team/:teamId/pages/retrospectives' },
  { id: 'surveys', label: 'Surveys', path: '/team/:teamId/pages/surveys' },
];

export function TeamRoomSidebar({ teamId, expanded, onToggle, className }: TeamRoomSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [moreItemsExpanded, setMoreItemsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [morePagesExpanded, setMorePagesExpanded] = useState(false);

  // Fetch team details
  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Mock sprints data - replace with actual query
  const sprints = [
    { id: 'sprint-1', name: 'Release 1' },
    { id: 'sprint-2', name: 'Release 2' },
    { id: 'sprint-3', name: 'Release 3' },
  ];

  const handleNavigation = (path: string) => {
    if (path === '#') return;
    const resolvedPath = path.replace(':teamId', teamId);
    navigate(resolvedPath);
    onToggle(); // Always collapse sidebar on navigation
  };

  const isActive = (path?: string) => {
    if (!path || path === '#') return false;
    const resolvedPath = path.replace(':teamId', teamId);
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  const handleExpandableClick = (itemId: string) => {
    if (itemId === 'more-items') {
      setMoreItemsExpanded(!moreItemsExpanded);
    } else if (itemId === 'reports') {
      setReportsExpanded(!reportsExpanded);
    } else if (itemId === 'more-pages') {
      setMorePagesExpanded(!morePagesExpanded);
    }
  };

  return (
    <aside 
      className={cn(
        "h-full border-r transition-all duration-200 flex-shrink-0 relative flex flex-col",
        expanded ? "w-60" : "w-16",
        className
      )}
      style={{
        background: 'var(--surface-elevated, var(--surface-1))',
        borderColor: 'var(--divider)',
      }}
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* V10 Header with circular badge */}
        <div 
          className={cn(
            "border-b flex-shrink-0",
            expanded
              ? "flex items-center justify-between px-3"
              : "flex flex-col items-center justify-center"
          )}
          style={{ 
            height: expanded ? '56px' : '64px',
            borderColor: 'var(--divider)',
            padding: expanded ? '0 12px' : '8px 0',
            gap: expanded ? undefined : '6px',
          }}
        >
          <div className={cn(
            "flex items-center gap-3",
            expanded ? "overflow-hidden min-w-0" : "w-full justify-center"
          )}>
            {/* V10 circular badge */}
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--ds-text-brand, #3b82f6) 0%, var(--ds-background-brand-bold-hovered, #1d4ed8) 100%)',
                color: 'var(--ds-surface, var(--ds-surface, #ffffff))',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
              }}
            >
              {team?.name?.substring(0, 2).toUpperCase() || 'TM'}
            </div>
            {expanded && (
              <span 
                className="text-[13px] font-semibold truncate tracking-tight"
                style={{ color: 'var(--text-1)' }}
              >
                {team?.name || 'Team'}
              </span>
            )}
          </div>
          {/* V10 collapse button */}
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center justify-center rounded-md transition-all flex-shrink-0 border bg-transparent hover:bg-blue-500/6",
              expanded ? "w-6 h-6 ml-2" : "w-5 h-5"
            )}
            style={{
              borderColor: 'var(--divider)',
              color: 'var(--text-3)',
            }}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? (
              <ChevronLeft className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Sprint Filter — only when expanded */}
        {expanded && (
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--divider)' }}>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 block tracking-wider">
              RELEASE
            </label>
            <Select value={selectedSprint || undefined} onValueChange={setSelectedSprint}>
              <SelectTrigger className="h-8 text-xs w-full bg-background border-border">
                <SelectValue placeholder="Select Release" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-[100]">
                {sprints.map(sprint => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation Menu — V10 styling */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const isExpandable = item.expandable;
            const isMoreItems = item.id === 'more-items';
            const isReports = item.id === 'reports';
            const isMorePages = item.id === 'more-pages';

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (isExpandable) {
                      handleExpandableClick(item.id);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center rounded-md text-[13px] transition-colors relative",
                    expanded ? "px-3 gap-3 justify-start" : "justify-center",
                    active 
                      ? "bg-blue-500/12 text-blue-600 font-medium" 
                      : "bg-transparent text-foreground hover:bg-blue-500/6 font-normal"
                  )}
                  style={{ height: '50px', marginBottom: '1px' }}
                  title={!expanded ? item.label : undefined}
                >
                  {/* V10 accent bar */}
                  {active && (
                    <span 
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: expanded ? '4px' : '6px',
                        bottom: expanded ? '4px' : '6px',
                        width: '3px',
                        background: 'var(--nav-accent-bar, #2563eb)',
                        borderRadius: '0 2px 2px 0',
                      }}
                    />
                  )}
                  <Icon 
                    className="flex-shrink-0" 
                    style={{ 
                      width: '17px', 
                      height: '17px',
                      color: active ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--nav-text-secondary, #3F3F46)',
                      strokeWidth: 1.4,
                    }}
                  />
                  {expanded && (
                    <>
                      <span className="truncate text-left flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-primary text-white rounded uppercase">
                          {item.badge}
                        </span>
                      )}
                      {item.expandable && (
                        <ChevronRight 
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            ((isMoreItems && moreItemsExpanded) || 
                             (isReports && reportsExpanded) || 
                             (isMorePages && morePagesExpanded)) && "rotate-90"
                          )} 
                          style={{ color: 'var(--text-4)' }}
                        />
                      )}
                    </>
                  )}
                </button>

                {/* More items submenu — V10 styling */}
                {isMoreItems && moreItemsExpanded && expanded && (
                  <div className="ml-5 mt-0.5">
                    {moreItemsSubMenu.map((subItem) => {
                      const subActive = isActive(subItem.path);
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleNavigation(subItem.path)}
                          className={cn(
                            "w-full flex items-center px-3 text-[12px] transition-colors relative rounded-md",
                            subActive 
                              ? "bg-blue-500/12 text-blue-600 font-medium" 
                              : "text-muted-foreground hover:bg-blue-500/6 hover:text-foreground"
                          )}
                          style={{ height: '32px', marginBottom: '1px' }}
                        >
                          {subActive && (
                            <span 
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: '4px',
                                bottom: '4px',
                                width: '3px',
                                background: 'var(--nav-accent-bar, #2563eb)',
                                borderRadius: '0 2px 2px 0',
                              }}
                            />
                          )}
                          <span className="truncate text-left">{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Reports submenu — V10 styling */}
                {isReports && reportsExpanded && expanded && (
                  <div className="ml-5 mt-0.5">
                    {reportsSubMenu.map((subItem) => {
                      const subActive = isActive(subItem.path);
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleNavigation(subItem.path)}
                          className={cn(
                            "w-full flex items-center px-3 text-[12px] transition-colors relative rounded-md",
                            subActive 
                              ? "bg-blue-500/12 text-blue-600 font-medium" 
                              : "text-muted-foreground hover:bg-blue-500/6 hover:text-foreground"
                          )}
                          style={{ height: '32px', marginBottom: '1px' }}
                        >
                          {subActive && (
                            <span 
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: '4px',
                                bottom: '4px',
                                width: '3px',
                                background: 'var(--nav-accent-bar, #2563eb)',
                                borderRadius: '0 2px 2px 0',
                              }}
                            />
                          )}
                          <span className="truncate text-left">{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* More pages submenu — V10 styling */}
                {isMorePages && morePagesExpanded && expanded && (
                  <div className="ml-5 mt-0.5">
                    {morePagesSubMenu.map((subItem) => {
                      const subActive = isActive(subItem.path);
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleNavigation(subItem.path)}
                          className={cn(
                            "w-full flex items-center px-3 text-[12px] transition-colors relative rounded-md",
                            subActive 
                              ? "bg-blue-500/12 text-blue-600 font-medium" 
                              : "text-muted-foreground hover:bg-blue-500/6 hover:text-foreground"
                          )}
                          style={{ height: '32px', marginBottom: '1px' }}
                        >
                          {subActive && (
                            <span 
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: '4px',
                                bottom: '4px',
                                width: '3px',
                                background: 'var(--nav-accent-bar, #2563eb)',
                                borderRadius: '0 2px 2px 0',
                              }}
                            />
                          )}
                          <span className="truncate text-left">{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer — V10 styling */}
        {expanded && (
          <div className="border-t pt-2" style={{ borderColor: 'var(--divider)', padding: '8px' }}>
            <button 
              className="w-full flex items-center gap-3 px-3 text-[13px] font-normal hover:bg-blue-500/6 transition-colors rounded-md relative"
              style={{ height: '50px' }}
              onClick={() => toast.info('Team Settings coming soon', { icon: <Lock className="h-4 w-4" /> })}
            >
              <Lock 
                style={{ 
                  width: '17px', 
                  height: '17px',
                  color: 'var(--nav-text-secondary, #3F3F46)',
                  strokeWidth: 1.4,
                }} 
              />
              <span className="text-left">Team Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
