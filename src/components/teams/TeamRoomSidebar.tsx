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
  Network
} from 'lucide-react';
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
  { id: 'sprints', label: 'Sprints', path: '/team/:teamId/sprints' },
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
  { id: 'detailed-sprint-progress', label: 'Detailed sprint progress', path: '/team/:teamId/reports/detailed-sprint-progress' },
  { id: 'external-reports', label: 'External reports', path: '/team/:teamId/reports/external' },
  { id: 'impediments-risks', label: 'Impediments & risks', path: '/team/:teamId/reports/impediments-risks' },
  { id: 'organizational-hierarchy', label: 'Organizational hierarchy', path: '/team/:teamId/reports/organizational-hierarchy' },
  { id: 'risk-impediment-status', label: 'Risk and impediment status', path: '/team/:teamId/reports/risk-impediment-status' },
  { id: 'sprint-coaching', label: 'Sprint coaching', path: '/team/:teamId/reports/sprint-coaching' },
  { id: 'sprint-health', label: 'Sprint health', path: '/team/:teamId/reports/sprint-health' },
  { id: 'sprint-metrics', label: 'Sprint metrics (M1)', path: '/team/:teamId/reports/sprint-metrics' },
  { id: 'sprint-performance', label: 'Sprint performance', path: '/team/:teamId/reports/sprint-performance' },
  { id: 'sprint-planning', label: 'Sprint planning', path: '/team/:teamId/reports/sprint-planning' },
  { id: 'sprint-review', label: 'Sprint review', path: '/team/:teamId/reports/sprint-review' },
  { id: 'sprint-scope-changes', label: 'Sprint scope changes', path: '/team/:teamId/reports/sprint-scope-changes' },
  { id: 'sprint-status', label: 'Sprint status', path: '/team/:teamId/reports/sprint-status' },
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
    { id: 'sprint-1', name: 'Sprint 1' },
    { id: 'sprint-2', name: 'Sprint 2' },
    { id: 'sprint-3', name: 'Sprint 3' },
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
        "h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col",
        expanded ? "w-[280px]" : "w-16",
        className
      )}
    >
      {/* Toggle Handle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-accent transition-transform"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className="h-full flex flex-col overflow-hidden">
        {/* Team Context Header */}
        <div className={cn("px-4 pt-4 pb-3 border-b", !expanded && "px-2")}>
          {expanded && (
            <>
              {/* Team Display */}
              <div className="py-2 px-3 mb-3 bg-accent/30 border border-border/50 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {team?.name?.substring(0, 2).toUpperCase() || 'TM'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {team?.name || 'Team'}
                    </div>
                    <div className="text-xs text-muted-foreground">Team</div>
                  </div>
                </div>
              </div>

              {/* Sprint Filter */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                  SPRINT
                </label>
                <Select value={selectedSprint || undefined} onValueChange={setSelectedSprint}>
                  <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                    <SelectValue placeholder="Select Sprint" />
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
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1">
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
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal transition-colors",
                    "hover:bg-accent/50",
                    active && "bg-accent text-primary font-medium",
                    !expanded && "justify-center px-2"
                  )}
                  title={!expanded ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  {expanded && (
                    <>
                      <span className="truncate text-left flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary text-white rounded uppercase">
                          {item.badge}
                        </span>
                      )}
                      {item.expandable && (
                        <ChevronRight 
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            ((isMoreItems && moreItemsExpanded) || 
                             (isReports && reportsExpanded) || 
                             (isMorePages && morePagesExpanded)) && "rotate-90"
                          )} 
                        />
                      )}
                    </>
                  )}
                </button>

                {/* More items submenu */}
                {isMoreItems && moreItemsExpanded && expanded && (
                  <div className="bg-accent/20">
                    {moreItemsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm font-normal transition-colors",
                          "hover:bg-accent/50",
                          isActive(subItem.path) && "bg-accent text-primary font-medium"
                        )}
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reports submenu */}
                {isReports && reportsExpanded && expanded && (
                  <div className="bg-accent/20">
                    {reportsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm font-normal transition-colors",
                          "hover:bg-accent/50",
                          isActive(subItem.path) && "bg-accent text-primary font-medium"
                        )}
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* More pages submenu */}
                {isMorePages && morePagesExpanded && expanded && (
                  <div className="bg-accent/20">
                    {morePagesSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm font-normal transition-colors",
                          "hover:bg-accent/50",
                          isActive(subItem.path) && "bg-accent text-primary font-medium"
                        )}
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="border-t">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Teams settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
