/**
 * Catalyst Header — Spaces-Centric Top Navigation
 * 
 * LEFT: [Logo] Catalyst | Home | SPACES ▼ [Scope Pill] | Roadmap | Reports | Admin
 * RIGHT: [Search] ⌘K | [Notifications] | [User Avatar]
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown, LogOut, Settings, Bell, User, LayoutGrid, BarChart3, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { GlobalSearchPalette } from "@/components/ui/global-search-palette";
import { NotificationsPanel } from "./NotificationsPanel";
import { catalystToast } from "@/lib/catalystToast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SpacesMegaMenu, ScopeIndicator, useSpacesScope } from "@/components/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Navigation items for the new structure
interface NavItem {
  label: string;
  path?: string;
  isSpaces?: boolean;
  requiresAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/for-you" },
  { label: "Spaces", isSpaces: true },
  { label: "Roadmap", path: "/enterprise/roadmap" },
  { label: "Reports", path: "/reports" },
  { label: "Admin", path: "/admin/activity", requiresAdmin: true },
];

export function CatalystHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const { isAdmin } = useUserRole();
  const { currentScope } = useSpacesScope();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error: any) {
      console.error('Sign out error:', error);
      navigate('/auth');
    }
  };

  // Check if nav item is active
  const isActive = (item: NavItem): boolean => {
    if (item.isSpaces) {
      // Spaces is active when in spaces routes or program/project/enterprise routes
      return location.pathname.startsWith('/spaces') ||
             location.pathname.startsWith('/program') ||
             location.pathname.startsWith('/programs') ||
             location.pathname.startsWith('/project') ||
             location.pathname.startsWith('/enterprise');
    }
    if (item.path) {
      if (item.label === 'Home') {
        return location.pathname === '/for-you' || location.pathname === '/home';
      }
      if (item.label === 'Admin') {
        return location.pathname.startsWith('/admin');
      }
      if (item.label === 'Reports') {
        return location.pathname.startsWith('/reports');
      }
      if (item.label === 'Roadmap') {
        return location.pathname.includes('roadmap');
      }
      return location.pathname.startsWith(item.path);
    }
    return false;
  };

  // Common nav button styles
  const getNavButtonStyles = (active: boolean): React.CSSProperties => ({
    height: '36px',
    padding: '0 14px',
    fontSize: '14px',
    fontWeight: active ? 600 : 500,
    color: active ? 'hsl(var(--primary))' : 'var(--nav-text)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease',
    border: 'none',
    background: active ? 'hsl(var(--primary) / 0.08)' : 'transparent',
    position: 'relative' as const,
    fontFamily: 'inherit',
    outline: 'none',
  });

  // Active underline indicator
  const ActiveUnderline = () => (
    <span 
      style={{
        position: 'absolute',
        bottom: '-10px',
        left: '14px',
        right: '14px',
        height: '2px',
        background: 'hsl(var(--primary))',
        borderRadius: '1px',
      }}
    />
  );

  return (
    <>
      {/* TopNav: 56px fixed height */}
      <header 
        className="sticky top-0 z-[100] flex items-center"
        style={{ 
          height: '56px', 
          borderBottom: '1px solid var(--divider)',
          padding: '0 16px',
          fontFamily: "var(--font-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
          backgroundColor: 'var(--nav-bg)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* ===== LOGO ZONE ===== */}
        <a 
          className="flex items-center flex-shrink-0 cursor-pointer no-underline"
          style={{ marginRight: '32px' }}
          onClick={() => navigate('/home')}
        >
          <span 
            className="catalyst-logo"
            style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              letterSpacing: '-0.5px',
              lineHeight: 1
            }}
          >
            <span className="text-foreground">Cata</span>
            <span className="text-brand-gold">lyst</span>
          </span>
        </a>
        
        {/* ===== NAVIGATION ZONE ===== */}
        <nav className="hidden md:flex items-center flex-1" style={{ gap: '4px' }}>
          <TooltipProvider>
            {NAV_ITEMS.map((item) => {
              // Skip admin if not admin
              if (item.requiresAdmin && !isAdmin) {
                return null;
              }

              const active = isActive(item);
              const navButtonStyle = getNavButtonStyles(active);

              // Spaces button with mega menu
              if (item.isSpaces) {
                return (
                  <div key={item.label} className="relative flex items-center gap-1">
                    <button
                      style={navButtonStyle}
                      onClick={() => setSpacesOpen(!spacesOpen)}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'hsl(var(--primary) / 0.08)' : 'transparent'; }}
                      aria-expanded={spacesOpen}
                      aria-haspopup="true"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Spaces</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", spacesOpen && "rotate-180")} />
                      {active && <ActiveUnderline />}
                    </button>

                    {/* Scope Indicator Pill */}
                    <ScopeIndicator />

                    {/* Mega Menu */}
                    <SpacesMegaMenu 
                      open={spacesOpen} 
                      onClose={() => setSpacesOpen(false)} 
                    />
                  </div>
                );
              }

              // Regular nav items
              return (
                <button
                  key={item.label}
                  style={navButtonStyle}
                  onClick={() => item.path && navigate(item.path)}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'hsl(var(--primary) / 0.08)' : 'transparent'; }}
                >
                  {item.label === 'Roadmap' && <BarChart3 className="w-4 h-4" />}
                  {item.label === 'Reports' && <FileText className="w-4 h-4" />}
                  {item.label === 'Admin' && <Settings className="w-4 h-4" />}
                  <span>{item.label}</span>
                  {active && <ActiveUnderline />}
                </button>
              );
            })}
          </TooltipProvider>
        </nav>
        
        {/* ===== ACTIONS ZONE ===== */}
        <div className="flex items-center flex-shrink-0" style={{ gap: '8px' }}>
          <TooltipProvider>
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "hidden sm:flex items-center gap-2 h-8 px-3 rounded-md border transition-all",
                "bg-[var(--surface-3)] border-[var(--border-default)] text-[var(--text-2)]",
                "hover:bg-[var(--surface-hover)] hover:border-[var(--border-accent)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1"
              )}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Search…</span>
              <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border px-1.5 text-[10px] font-medium border-[var(--border-color)] bg-[var(--surface-2)] text-[var(--text-3)]">
                ⌘K
              </kbd>
            </button>
            
            {/* Mobile search icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "sm:hidden flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                "text-[var(--icon-default)] hover:bg-[var(--nav-hover-bg)]"
              )}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <Tooltip>
              <TooltipTrigger asChild>
                <NotificationsPanel />
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground text-[13px] font-semibold cursor-pointer transition-transform hover:scale-105 bg-gradient-to-br from-primary to-primary/80"
                  title="Profile"
                >
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">User Account</p>
                </div>
                <DropdownMenuItem 
                  onClick={() => navigate('/profile')} 
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate('/admin/settings/notifications')} 
                  className="cursor-pointer"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notification Settings</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem 
                    onClick={() => navigate('/admin/activity')} 
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Administration</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
      </header>

      {/* Global Search Command Palette */}
      <GlobalSearchPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
