/**
 * Test Management Layout
 * Provides sidebar navigation, header, and content area for TM module
 * Fully responsive with mobile drawer support
 */

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
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
  Menu,
  FlaskConical,
  Play,
  Link2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { TMProjectSelector } from '../components/layout/TMProjectSelector';
import { TMGlobalSearch } from '../components/layout/TMGlobalSearch';
import { useUIStore } from '../stores/uiStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  separator?: boolean;
}

const navItems: NavItem[] = [
  { path: '/tests/command-center', label: 'Command Center', icon: LayoutDashboard },
  { path: '/tests/my-work', label: 'My Work', icon: User, badge: 12 },
  { path: '/tests/cases', label: 'Test Cases', icon: FileText, badge: 156 },
  { path: '/tests/cycles', label: 'Test Cycles', icon: RefreshCw, badge: 8 },
  { path: '/tests/execution', label: 'Execution', icon: Play },
  { path: '/tests/defects', label: 'Defects', icon: Bug, badge: 23 },
  { path: '/tests/requirements', label: 'Requirements', icon: Link2 },
  { path: '/tests/reports', label: 'Reports', icon: BarChart3 },
  { path: '/tests/settings', label: 'Settings', icon: Settings, separator: true },
];

export function TestManagementLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useUIStore();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Generate breadcrumbs from path
  const getBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Command Center', path: '/tests' }];

    if (pathParts.length > 1) {
      const currentNav = navItems.find((item) => item.path === location.pathname);
      if (currentNav) {
        breadcrumbs.push({ label: currentNav.label, path: currentNav.path });
      } else if (pathParts[1] === 'cycles' && pathParts[2]) {
        breadcrumbs.push({ label: 'Test Cycles', path: '/tests/cycles' });
        breadcrumbs.push({ label: pathParts[2].toUpperCase(), path: location.pathname });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Sidebar Navigation Content
  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Header - Fixed 52px height to align with main header */}
      <div
        className="flex items-center"
        style={{ 
          height: '52px', 
          padding: collapsed ? '0' : '0 12px',
          borderBottom: '1px solid var(--divider, hsl(var(--border)))',
        }}
      >
        <div className={cn(
          'flex items-center gap-2',
          collapsed && 'justify-center w-full'
        )}>
          <FlaskConical className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-foreground">Tests</span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const showSeparator = item.separator && index > 0;

            return (
              <React.Fragment key={item.path}>
                {showSeparator && <div className="my-2 border-t border-border" />}
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.path}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-md transition-colors mx-auto relative',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.badge && !isActive && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="flex items-center gap-2">
                        {item.label}
                        {item.badge && (
                          <Badge variant="secondary" className="h-5">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <NavLink
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant={isActive ? 'secondary' : 'outline'}
                        className={cn(
                          'h-5 min-w-5 justify-center',
                          isActive && 'bg-primary-foreground/20 text-primary-foreground border-0'
                        )}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </NavLink>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse Toggle (Desktop only) */}
      <div className="border-t border-border p-2 hidden lg:block">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            'w-full justify-center text-muted-foreground hover:text-foreground',
            collapsed && 'px-0'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/30">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-background transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-border bg-background px-4" style={{ height: '52px' }}>
          {/* Left Section */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

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
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Global Search Button */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2 text-muted-foreground w-64 justify-between"
              onClick={() => setSearchOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Search...</span>
              </div>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

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
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">john.doe@company.com</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>My Profile</DropdownMenuItem>
                <DropdownMenuItem>Preferences</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-muted/30">
          <Outlet />
        </main>
      </div>

      {/* Global Search Dialog */}
      <TMGlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export default TestManagementLayout;
