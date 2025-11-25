import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HelpCircle,
  User,
  LogOut,
  ChevronDown,
  Briefcase,
  Layers,
  TrendingUp,
  AlertTriangle,
  Calendar,
  FolderKanban,
  Map,
  Link2,
  BarChart,
  ListTodo,
  GitMerge,
  ClipboardList,
  CheckSquare,
  Rocket,
  LayoutDashboard,
  Target,
  GitBranch,
  Users,
  BarChart3,
  Settings,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  icon: any;
  path: string;
  children?: { title: string; path: string; icon: any }[];
}

const navigation: NavItem[] = [
  {
    title: 'Portfolio',
    icon: Briefcase,
    path: '/portfolio',
    children: [
      { title: 'Portfolio Room', path: '/portfolio-room', icon: LayoutDashboard },
      { title: 'Strategy Room', path: '/strategy-room', icon: Target },
      { title: 'Themes', path: '/themes', icon: Layers },
      { title: 'Initiatives', path: '/initiatives', icon: TrendingUp },
      { title: 'Epics', path: '/epics', icon: Rocket },
      { title: 'Features', path: '/features', icon: CheckSquare },
      { title: 'Portfolio Kanban', path: '/portfolio-kanban', icon: FolderKanban },
      { title: 'Portfolio Roadmap', path: '/portfolio-roadmap', icon: Map },
      { title: 'Dependencies', path: '/dependencies', icon: Link2 },
      { title: 'Portfolio Insights', path: '/portfolio-insights', icon: BarChart },
    ],
  },
  {
    title: 'Program',
    icon: GitBranch,
    path: '/program',
    children: [
      { title: 'Program Room', path: '/program-room', icon: LayoutDashboard },
      { title: 'Program Increments', path: '/pis', icon: Calendar },
      { title: 'Program Board', path: '/program-board', icon: FolderKanban },
      { title: 'ROAM Board', path: '/roam', icon: AlertTriangle },
      { title: 'Capacity Planning', path: '/capacity', icon: BarChart3 },
      { title: 'Release Calendar', path: '/release-train-calendar', icon: Calendar },
      { title: 'Program Backlog', path: '/program-backlog', icon: ListTodo },
    ],
  },
  {
    title: 'Team',
    icon: Users,
    path: '/team',
    children: [
      { title: 'Team Room', path: '/team-room', icon: LayoutDashboard },
      { title: 'Backlog', path: '/backlog', icon: ListTodo },
      { title: 'Sprints', path: '/sprints', icon: Calendar },
      { title: 'Sprint Board', path: '/sprint-board', icon: FolderKanban },
      { title: 'Stories', path: '/work-items/stories', icon: ClipboardList },
      { title: 'Sub-tasks', path: '/work-items/subtasks', icon: CheckSquare },
      { title: 'Releases', path: '/releases', icon: Rocket },
    ],
  },
  {
    title: 'Insights',
    icon: BarChart3,
    path: '/insights',
    children: [
      { title: 'Portfolio Insights', path: '/insights/portfolio', icon: Briefcase },
      { title: 'Program Insights', path: '/insights/program', icon: GitBranch },
      { title: 'Team Insights', path: '/insights/team', icon: Users },
      { title: 'Predictability', path: '/insights/predictability', icon: TrendingUp },
      { title: 'Dependency Risk', path: '/insights/dependency-risk', icon: AlertTriangle },
    ],
  },
  {
    title: 'Admin',
    icon: Settings,
    path: '/admin',
    children: [
      { title: 'Organization Setup', path: '/admin/org-setup', icon: Layers },
      { title: 'Hierarchy Config', path: '/admin/hierarchy', icon: GitMerge },
      { title: 'Custom Fields', path: '/admin/custom-fields', icon: FileText },
      { title: 'Board Configuration', path: '/admin/boards', icon: FolderKanban },
      { title: 'User Roles', path: '/admin/user-roles', icon: Users },
      { title: 'Permissions', path: '/admin/permissions', icon: Users },
      { title: 'Integrations', path: '/admin/integrations', icon: Link2 },
      { title: 'Activity Log', path: '/admin/activity-log', icon: ClipboardList },
    ],
  },
];

function AppSidebarContent() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isCollapsed = state === 'collapsed';

  // Determine which sections should be open based on current route
  const getDefaultOpenSections = () => {
    const openSections: string[] = [];
    navigation.forEach((section) => {
      if (section.children?.some((child) => currentPath === child.path)) {
        openSections.push(section.title);
      }
    });
    return openSections.length > 0 ? openSections : ['Portfolio'];
  };

  const [expandedSections, setExpandedSections] = useState<string[]>(getDefaultOpenSections());

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isSectionActive = (section: NavItem) => {
    return section.children?.some((child) => currentPath === child.path) || false;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarContent>
          <ScrollArea className="flex-1">
            {navigation.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.title);
              const isActive = isSectionActive(section);

              return (
                <SidebarGroup key={section.title} className="px-2 py-0">
                  <SidebarGroupLabel asChild>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleSection(section.title)}
                            className={cn(
                              'flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent transition-colors',
                              isActive && 'bg-accent text-accent-foreground'
                            )}
                          >
                            <SectionIcon className="h-4 w-4 shrink-0" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-4">
                          {section.title}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        onClick={() => toggleSection(section.title)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent transition-colors',
                          isActive && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <SectionIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left truncate">{section.title}</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform shrink-0',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                    )}
                  </SidebarGroupLabel>

                  {!isCollapsed && isExpanded && section.children && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = currentPath === child.path;
                          return (
                            <SidebarMenuItem key={child.path}>
                              <NavLink
                                to={child.path}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full",
                                  isChildActive 
                                    ? "bg-primary/10 text-primary font-medium" 
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{child.title}</span>
                              </NavLink>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              );
            })}
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarContent />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top Header */}
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 flex-shrink-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Catalyst
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <GlobalSearch />
              </div>

              <Button variant="default" size="sm" className="hidden sm:flex">
                Create
              </Button>

              <NotificationBell />

              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.email}</p>
                      <p className="text-xs text-muted-foreground">User Account</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto min-h-0 w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
