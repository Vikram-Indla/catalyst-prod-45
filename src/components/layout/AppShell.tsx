import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { RoomNavigation } from './RoomNavigation';
import { PersistentFilters } from './PersistentFilters';
import { RoomSidebar } from './RoomSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HelpCircle, User, LogOut } from 'lucide-react';
import { Outlet } from 'react-router-dom';

/**
 * Jira Align-style App Shell with Room Navigation
 * Source: https://help.jiraalign.com/hc/en-us/articles/17158556046612-Navigate-Jira-Align
 */

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full">
        {/* Room-based sidebar */}
        <RoomSidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top Navigation Bar with Rooms and Filters */}
          <header className="h-14 border-b bg-card flex items-center gap-4 px-4 flex-shrink-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Catalyst
              </h1>
            </div>

            {/* Room Navigation */}
            <RoomNavigation />

            {/* Persistent Filters */}
            <PersistentFilters />

            {/* Right Side Actions */}
            <div className="ml-auto flex items-center gap-2">
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
          <main className="flex-1 overflow-auto min-h-0 w-full bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
