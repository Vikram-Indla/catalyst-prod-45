import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NavLink } from '@/components/NavLink';
import {
  Target, Layers, TrendingUp, Rocket, CheckSquare, FolderKanban, Map, Link2, BarChart,
  LayoutDashboard, Calendar, AlertTriangle, BarChart3, ListTodo, ClipboardList,
  Settings, GitMerge, FileText, Users, Zap, Activity,
} from 'lucide-react';

/**
 * Left sidebar showing views within the current room
 * Source: https://help.jiraalign.com/hc/en-us/articles/17158556046612-Navigate-Jira-Align
 * 
 * Views are organized by category:
 * - Track: Dashboards and boards for execution tracking
 * - Transform: Planning and roadmap views
 * - Items: Work item lists for management
 */

interface ViewItem {
  title: string;
  path: string;
  icon: any;
}

interface ViewGroup {
  category: string;
  views: ViewItem[];
}

const strategyViews: ViewGroup[] = [
  {
    category: 'Track',
    views: [
      { title: 'Strategy Room', path: '/strategy-room', icon: LayoutDashboard },
    ],
  },
  {
    category: 'Items',
    views: [
      { title: 'Objectives', path: '/strategy-room', icon: Target },
    ],
  },
];

const portfolioViews: ViewGroup[] = [
  {
    category: 'Track',
    views: [
      { title: 'Portfolio Room', path: '/portfolio-room', icon: LayoutDashboard },
      { title: 'Portfolio Kanban', path: '/portfolio-kanban', icon: FolderKanban },
      { title: 'Portfolio Insights', path: '/portfolio-insights', icon: BarChart },
    ],
  },
  {
    category: 'Transform',
    views: [
      { title: 'Portfolio Roadmap', path: '/portfolio-roadmap', icon: Map },
      { title: 'Dependencies', path: '/dependencies', icon: Link2 },
    ],
  },
  {
    category: 'Items',
    views: [
      { title: 'Themes', path: '/themes', icon: Layers },
      { title: 'Initiatives', path: '/initiatives', icon: TrendingUp },
      { title: 'Epics', path: '/epics', icon: Rocket },
      { title: 'Features', path: '/features', icon: CheckSquare },
    ],
  },
];

const programViews: ViewGroup[] = [
  {
    category: 'Track',
    views: [
      { title: 'Program Room', path: '/program-room', icon: LayoutDashboard },
      { title: 'Program Board', path: '/program-board', icon: FolderKanban },
      { title: 'PI Objectives', path: '/pi-objectives', icon: Target },
      { title: 'ROAM Board', path: '/roam', icon: AlertTriangle },
    ],
  },
  {
    category: 'Transform',
    views: [
      { title: 'PI Planning', path: '/pis', icon: Calendar },
      { title: 'Capacity Planning', path: '/capacity', icon: BarChart3 },
      { title: 'Release Calendar', path: '/release-train-calendar', icon: Calendar },
      { title: 'Value Stream', path: '/value-stream', icon: TrendingUp },
    ],
  },
  {
    category: 'Items',
    views: [
      { title: 'Program Backlog', path: '/program-backlog', icon: ListTodo },
      { title: 'Features', path: '/features', icon: CheckSquare },
    ],
  },
];

const teamViews: ViewGroup[] = [
  {
    category: 'Track',
    views: [
      { title: 'Team Room', path: '/team-room', icon: LayoutDashboard },
      { title: 'Sprint Board', path: '/sprint-board', icon: FolderKanban },
    ],
  },
  {
    category: 'Transform',
    views: [
      { title: 'Backlog', path: '/backlog', icon: ListTodo },
      { title: 'Sprints', path: '/sprints', icon: Calendar },
      { title: 'Releases', path: '/releases', icon: Rocket },
    ],
  },
  {
    category: 'Items',
    views: [
      { title: 'Stories', path: '/work-items/stories', icon: ClipboardList },
      { title: 'Sub-tasks', path: '/work-items/subtasks', icon: CheckSquare },
    ],
  },
];

const adminViews: ViewGroup[] = [
  {
    category: 'Configuration',
    views: [
      { title: 'Organization Setup', path: '/admin/org-setup', icon: Layers },
      { title: 'Hierarchy Config', path: '/admin/hierarchy', icon: GitMerge },
      { title: 'Custom Fields', path: '/admin/custom-fields', icon: FileText },
      { title: 'Board Configuration', path: '/admin/boards', icon: FolderKanban },
    ],
  },
  {
    category: 'Security',
    views: [
      { title: 'User Roles', path: '/admin/user-roles', icon: Users },
      { title: 'Permissions', path: '/admin/permissions', icon: Users },
    ],
  },
  {
    category: 'Integration',
    views: [
      { title: 'Integrations', path: '/admin/integrations', icon: Link2 },
      { title: 'Activity Log', path: '/admin/activity-log', icon: ClipboardList },
      { title: 'Reports Discovery', path: '/reports-discovery', icon: BarChart },
      { title: 'PI Wizard', path: '/pi-wizard', icon: Zap },
      { title: 'Jira Integration', path: '/jira-integration', icon: Link2 },
    ],
  },
];

export function RoomSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRoom } = useNavigation();
  
  // Determine which views to show based on current room
  const getViewsForRoom = () => {
    if (location.pathname.includes('/admin/')) {
      return adminViews;
    }
    
    switch (currentRoom) {
      case 'strategy':
        return strategyViews;
      case 'portfolio':
        return portfolioViews;
      case 'program':
        return programViews;
      case 'team':
        return teamViews;
      default:
        return portfolioViews;
    }
  };
  
  const views = getViewsForRoom();
  
  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <ScrollArea className="flex-1">
          {views.map((group) => (
            <SidebarGroup key={group.category} className="px-2">
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.category}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.views.map((view) => {
                    const Icon = view.icon;
                    const isActive = location.pathname === view.path;
                    
                    return (
                      <SidebarMenuItem key={view.path}>
                        <NavLink
                          to={view.path}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{view.title}</span>
                        </NavLink>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
