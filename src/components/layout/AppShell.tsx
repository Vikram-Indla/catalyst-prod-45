import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Target,
  GitBranch,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  Search,
  Bell,
  HelpCircle,
  User,
  LogOut,
  Menu,
  X,
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
  FileText,
  Rocket,
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
      { title: 'Business Requests', path: '/business-requests', icon: FileText },
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
      { title: 'Permissions', path: '/admin/permissions', icon: Users },
      { title: 'Integrations', path: '/admin/integrations', icon: Link2 },
      { title: 'Activity Log', path: '/admin/activity-log', icon: ClipboardList },
    ],
  },
];

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Portfolio']);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Catalyst
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search... (⌘K)"
              className="w-64 pl-8"
            />
          </div>
          
          <Button variant="default" size="sm" className="hidden sm:flex">
            Create
          </Button>

          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

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
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'border-r bg-muted/10 transition-all duration-300 flex-shrink-0',
            sidebarOpen ? 'w-64' : 'w-0 lg:w-16',
            'lg:relative absolute inset-y-0 left-0 z-40 lg:z-0'
          )}
        >
          <ScrollArea className="h-full">
            <nav className="p-2 space-y-1">
              {navigation.map((section) => (
                <div key={section.title}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start',
                      !sidebarOpen && 'lg:justify-center lg:px-2'
                    )}
                    onClick={() => {
                      if (section.children) {
                        toggleSection(section.title);
                      } else {
                        navigate(section.path);
                      }
                    }}
                  >
                    <section.icon className={cn('h-4 w-4', sidebarOpen && 'mr-2')} />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{section.title}</span>
                        {section.children && (
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              expandedSections.includes(section.title) && 'rotate-180'
                            )}
                          />
                        )}
                      </>
                    )}
                  </Button>
                  
                  {sidebarOpen && section.children && expandedSections.includes(section.title) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {section.children.map((child) => (
                        <Button
                          key={child.path}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => navigate(child.path)}
                        >
                          <child.icon className="h-3.5 w-3.5 mr-2" />
                          {child.title}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
