import { useState } from 'react';
import { Outlet, Link, useParams, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Columns3,
  ListTodo,
  Timer,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Plus,
} from 'lucide-react';
import { useProjectByKey } from '@/hooks/useProjects';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';
import { GlobalSearch } from '@/components/GlobalSearch';

export default function ProjectLayout() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);

  const { data: project, isLoading, error } = useProjectByKey(projectKey);

  if (isLoading) {
    return <ProjectLayoutSkeleton />;
  }

  if (error || !project) {
    return <Navigate to="/projects" replace />;
  }

  const navigation = [
    {
      name: 'Summary',
      href: `/projects/${projectKey}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'Board',
      href: `/projects/${projectKey}/board`,
      icon: Columns3,
    },
    {
      name: 'Backlog',
      href: `/projects/${projectKey}/backlog`,
      icon: ListTodo,
      show: project.project_type !== 'basic',
    },
    {
      name: 'Sprints',
      href: `/projects/${projectKey}/sprints`,
      icon: Timer,
      show: project.project_type === 'scrum',
    },
    {
      name: 'Reports',
      href: `/projects/${projectKey}/reports`,
      icon: BarChart3,
    },
    {
      name: 'Settings',
      href: `/projects/${projectKey}/settings`,
      icon: Settings,
    },
  ].filter(item => item.show !== false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-muted/30">
        {/* Sidebar */}
        <aside 
          className={cn(
            "flex flex-col bg-background border-r transition-all duration-200",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          {/* Project Header */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold shrink-0"
                style={{ backgroundColor: project.color || 'hsl(var(--primary))' }}
              >
                {project.key.substring(0, 2)}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground truncate">
                    {project.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">{project.key}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {!sidebarCollapsed && (
            <div className="p-3 border-b">
              <Button 
                className="w-full justify-start"
                onClick={() => setShowCreateIssue(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Issue
              </Button>
            </div>
          )}

          {sidebarCollapsed && (
            <div className="p-3 border-b flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon"
                    onClick={() => setShowCreateIssue(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Create Issue
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center justify-center p-2 rounded-lg transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle */}
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Collapse
                </>
              )}
            </Button>
          </div>

          {/* Back to Projects */}
          <div className="p-3 border-t">
            {sidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/projects"
                    className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <FolderKanban className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  All Projects
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                to="/projects"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <FolderKanban className="w-5 h-5" />
                <span>All Projects</span>
              </Link>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-14 bg-background border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            <Outlet context={{ project }} />
          </div>
        </main>

        {/* Create Issue Dialog */}
        <CreateIssueDialog
          open={showCreateIssue}
          onOpenChange={setShowCreateIssue}
          projectId={project.id}
          projectKey={project.key}
        />
      </div>
    </TooltipProvider>
  );
}

function ProjectLayoutSkeleton() {
  return (
    <div className="flex h-screen bg-muted/30">
      <aside className="w-64 bg-background border-r p-4">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </aside>
      <main className="flex-1">
        <Skeleton className="h-14 w-full" />
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    </div>
  );
}
