/**
 * Test Management Layout
 * Provides sidebar navigation, header, and content area for TM module
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  RefreshCw,
  Bug,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { path: '/test-management/my-work', label: 'My Work', icon: Home },
  { path: '/test-management/cases', label: 'Test Cases', icon: FileText },
  { path: '/test-management/cycles', label: 'Test Cycles', icon: RefreshCw },
  { path: '/test-management/defects', label: 'Defects', icon: Bug },
  { path: '/test-management/reports', label: 'Reports', icon: BarChart3 },
  { path: '/test-management/settings', label: 'Settings', icon: Settings },
];

// Mock projects for selector
const mockProjects = [
  { id: 'proj-1', name: 'Catalyst Platform', key: 'CAT' },
  { id: 'proj-2', name: 'Mobile App', key: 'MOB' },
  { id: 'proj-3', name: 'API Gateway', key: 'API' },
];

export function TestManagementLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState(mockProjects[0].id);
  const location = useLocation();

  // Generate breadcrumbs from path
  const getBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Test Management', path: '/test-management' }];
    
    if (pathParts.length > 1) {
      const currentNav = navItems.find(item => item.path === location.pathname);
      if (currentNav) {
        breadcrumbs.push({ label: currentNav.label, path: currentNav.path });
      }
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentProject = mockProjects.find(p => p.id === selectedProject);

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-1">
      {/* Left Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border-default bg-sidebar-background transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Project Selector */}
        <div className={cn(
          'border-b border-border-default p-3',
          isCollapsed && 'flex justify-center'
        )}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm">
                  {currentProject?.key?.slice(0, 2) || 'TM'}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {currentProject?.name || 'Select Project'}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full bg-surface-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                    {currentProject?.key?.slice(0, 2) || 'TM'}
                  </div>
                  <SelectValue placeholder="Select project" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {mockProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs font-semibold">
                        {project.key.slice(0, 2)}
                      </div>
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              if (isCollapsed) {
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.path}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-md transition-colors mx-auto',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="border-t border-border-default p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'w-full justify-center text-muted-foreground hover:text-foreground',
              isCollapsed && 'px-0'
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-border-default bg-surface-0 px-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <NavLink
                  to={crumb.path}
                  className={cn(
                    'hover:text-primary transition-colors',
                    index === breadcrumbs.length - 1
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {crumb.label}
                </NavLink>
              </React.Fragment>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tests, cycles, defects..."
                className="pl-9 h-9 bg-surface-2"
              />
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                3
              </Badge>
            </Button>

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-surface-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default TestManagementLayout;
