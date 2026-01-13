import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnabledModules } from "@/hooks/useModules";
import { useSingleItemNavigation } from "@/hooks/useSingleItemNavigation";
import { Button } from "@/components/ui/button";
import { CreateDropdown } from "./CreateDropdown";
import { GlobalSearchPalette } from "@/components/ui/global-search-palette";
import { NotificationsPanel } from "./NotificationsPanel";
import { ProgramSelectorDropdown } from "./ProgramSelectorDropdown";
import { ProjectSelectorDropdown } from "./ProjectSelectorDropdown";
import { ProductSelectorDropdown } from "./ProductSelectorDropdown";

import { MobileNavigationMenu } from "./MobileNavigationMenu";
import { ReleaseDropdown } from "./ReleaseDropdown";
import { catalystToast } from "@/lib/catalystToast";
import { CreateEntityDialog } from "@/components/dialogs/CreateEntityDialog";
import { useCatalystContext } from "@/contexts/CatalystContext";
import { getActiveNavItem } from "@/lib/workspaceContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/hooks/useTheme";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CatalystHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { isAdmin, canAccessEnterprise, isProductOwnerOnly } = useUserRole();
  const { isModuleEnabled, isLoading: modulesLoading } = useEnabledModules();
  const { workspaceType } = useCatalystContext();
  const singleItemNav = useSingleItemNavigation();
  
  // Get active nav item based on workspace context
  const activeNavItem = getActiveNavItem(workspaceType);

  // Create entity dialog states - lifted from dropdowns
  const [createDialogType, setCreateDialogType] = useState<'program' | 'project' | 'product' | null>(null);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Handle create success callbacks
  const handleCreateSuccess = (entity: { id: string; name: string; key?: string }) => {
    if (createDialogType === 'program') {
      navigate(`/program/${entity.id}/room`);
    } else if (createDialogType === 'project') {
      navigate(`/programs/${entity.id}/room`);
    } else if (createDialogType === 'product') {
      const key = entity.key || entity.name.toUpperCase().slice(0, 3);
      const path = key.toUpperCase() === 'IND' || key.toUpperCase() === 'INDUSTRY' 
        ? '/industry' 
        : key.toUpperCase() === 'MIN' || key.toUpperCase() === 'MINING'
          ? '/mining'
          : `/product/${key.toLowerCase()}/room`;
      navigate(path);
    }
    setCreateDialogType(null);
  };

  const handleSignOut = async () => {
    try {
      // Always attempt to sign out - don't check for session first
      // Use scope: 'local' to clear local session even if server session is gone
      await supabase.auth.signOut({ scope: 'local' });
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error: any) {
      // If sign out fails, still redirect to auth page
      console.error('Sign out error:', error);
      navigate('/auth');
    }
  };

  // Handle click on disabled module
  const handleDisabledModuleClick = (label: string) => {
    if (isAdmin) {
      navigate('/admin/modules-packages');
    } else {
      catalystToast.info(
        'Module Disabled',
        'This module is disabled by your organization.'
      );
    }
  };

  // Define nav items with their module codes - each module has its own code
  const allNavItems = [
    { label: "Home", path: "/for-you", moduleCode: null, visibleToProductOwner: true }, // Always visible
    { label: "Enterprise", path: "/enterprise/strategy-room", moduleCode: "ENTERPRISE", requiresEnterpriseAccess: true, visibleToProductOwner: true },
    { label: "Product", hasDropdown: true, moduleCode: "PRODUCT", visibleToProductOwner: true },
    { label: "Program", hasDropdown: true, moduleCode: "PORTFOLIO", visibleToProductOwner: false },
    { label: "Project", hasDropdown: true, moduleCode: "PROGRAM", visibleToProductOwner: false },
    { label: "Releases", path: "/releases/command-center", moduleCode: null, visibleToProductOwner: false }, // Release & Test Management Module
    { label: "Operations", hasDropdown: true, path: "/release", moduleCode: null, visibleToProductOwner: false }, // Always visible
    { label: "Planner", path: "/planner/boards", moduleCode: null, visibleToProductOwner: true }, // Always visible - direct navigation
  ];

  // Get all nav items with their enabled status
  // Enterprise requires both module enabled AND role-based access (admin, super_admin)
  // Product Owner only sees Home, Enterprise, Product, and Planner
  const navItems = allNavItems
    .filter(item => !isProductOwnerOnly || item.visibleToProductOwner)
    .map(item => ({
      ...item,
      isEnabled: item.moduleCode === null 
        ? true 
        : item.requiresEnterpriseAccess 
          ? isModuleEnabled(item.moduleCode) && canAccessEnterprise
          : isModuleEnabled(item.moduleCode),
    }));

  const { isDark } = useTheme();

  return (
    <>
      {/* TopNav: 56px fixed height, theme-aware bg, elevation + bottom border for enterprise frame */}
      <header 
        className="sticky top-0 z-[100] flex items-center"
        style={{ 
          height: '56px', 
          borderBottom: '1px solid var(--divider)',
          padding: '0 16px',
          fontFamily: "var(--font-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
          backgroundColor: 'var(--nav-bg)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* ===== LOGO ZONE - Split color treatment ===== */}
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
            {navItems.map((item) => {
              // Disabled module rendering
              if (!item.isEnabled) {
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <button
                        className="flex items-center cursor-not-allowed opacity-40"
                        style={{
                          height: '36px',
                          padding: '0 14px',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--nav-text)',
                          borderRadius: '6px',
                          gap: '4px',
                          border: 'none',
                          background: 'transparent',
                        }}
                        onClick={() => handleDisabledModuleClick(item.label)}
                      >
                        {item.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {isAdmin 
                          ? `This module is disabled. Enable it in Administration → Modules & Packages.`
                          : `This module is disabled by your organization.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              // Check if this nav item is active
              const isActive = item.label === activeNavItem;
              
              // TopNav item styles - executive grade
              // Active nav items use blue text + blue underline per design system v2.0
              const navButtonStyle: React.CSSProperties = {
                height: '36px',
                padding: '0 14px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'hsl(var(--primary))' : 'var(--nav-text)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'background 0.15s ease, color 0.15s ease',
                border: 'none',
                background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                position: 'relative' as const,
                fontFamily: 'inherit',
                outline: 'none',
              };
              
              // Active underline indicator - 2px evergreen underline
              const activeUnderline = isActive ? (
                <span 
                  style={{
                    position: 'absolute',
                    bottom: '-10px',
                    left: '14px',
                    right: '14px',
                    height: '2px',
                    background: 'var(--brand-active)',
                    borderRadius: '1px',
                  }}
                />
              ) : null;
              
              return (
                <div key={item.label} className="inline-flex items-center relative">
                  {item.label === "Product" ? (
                    // Product: Direct navigation if single active product line
                    singleItemNav.product.hasSingleItem && singleItemNav.product.directPath ? (
                      <button
                        style={navButtonStyle}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--nav-active-bg)' : 'transparent'; }}
                        onClick={() => navigate(singleItemNav.product.directPath!)}
                      >
                        {item.label}
                        {activeUnderline}
                      </button>
                    ) : (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <button 
                            style={navButtonStyle}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--nav-active-bg)' : 'transparent'; }}
                          >
                            {item.label}
                            <ChevronDown style={{ width: '16px', height: '16px' }} />
                            {activeUnderline}
                          </button>
                        </PopoverTrigger>
                        {activeDropdown === item.label && (
                          <PopoverContent className="p-0 w-auto" align="start">
                            <ProductSelectorDropdown 
                              onClose={() => setActiveDropdown(null)} 
                              onCreateClick={() => setCreateDialogType('product')}
                            />
                          </PopoverContent>
                        )}
                      </Popover>
                    )
                  ) : item.label === "Program" ? (
                    // Program: Direct navigation if single accessible program
                    singleItemNav.program.hasSingleItem && singleItemNav.program.directPath ? (
                      <button
                        style={navButtonStyle}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--nav-active-bg)' : 'transparent'; }}
                        onClick={() => navigate(singleItemNav.program.directPath!)}
                      >
                        {item.label}
                        {activeUnderline}
                      </button>
                    ) : (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <button 
                            style={navButtonStyle}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--nav-active-bg)' : 'transparent'; }}
                          >
                            {item.label}
                            <ChevronDown style={{ width: '16px', height: '16px' }} />
                            {activeUnderline}
                          </button>
                        </PopoverTrigger>
                        {activeDropdown === item.label && (
                          <PopoverContent className="p-0 w-auto" align="start">
                            <ProgramSelectorDropdown 
                              onClose={() => setActiveDropdown(null)} 
                              onCreateClick={() => setCreateDialogType('program')}
                            />
                          </PopoverContent>
                        )}
                      </Popover>
                    )
                  ) : item.label === "Project" ? (
                    // Project: Direct navigation if single accessible project
                    singleItemNav.project.hasSingleItem && singleItemNav.project.directPath ? (
                      <button
                        style={navButtonStyle}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--nav-active-bg)' : 'transparent'; }}
                        onClick={() => navigate(singleItemNav.project.directPath!)}
                      >
                        {item.label}
                        {activeUnderline}
                      </button>
                    ) : (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <button 
                            style={navButtonStyle}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--nav-active-bg)' : 'transparent'; }}
                          >
                            {item.label}
                            <ChevronDown style={{ width: '16px', height: '16px' }} />
                            {activeUnderline}
                          </button>
                        </PopoverTrigger>
                        {activeDropdown === item.label && (
                          <PopoverContent className="p-0 w-auto" align="start">
                            <ProjectSelectorDropdown 
                              onClose={() => setActiveDropdown(null)} 
                              onCreateClick={() => setCreateDialogType('project')}
                            />
                          </PopoverContent>
                        )}
                      </Popover>
                    )
                  ) : item.label === "Release" ? (
                    // Release: Direct navigation for non-admins (no dropdown options)
                    singleItemNav.release.hasSingleItem && singleItemNav.release.directPath ? (
                      <button
                        style={{
                          ...navButtonStyle,
                          color: location.pathname.startsWith('/release') ? 'var(--text-primary)' : navButtonStyle.color,
                          fontWeight: location.pathname.startsWith('/release') ? 600 : navButtonStyle.fontWeight,
                          background: location.pathname.startsWith('/release') ? 'var(--nav-active-bg)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = location.pathname.startsWith('/release') ? 'var(--nav-active-bg)' : 'transparent'; }}
                        onClick={() => navigate(singleItemNav.release.directPath!)}
                      >
                        {item.label}
                        {location.pathname.startsWith('/release') && (
                          <span 
                            style={{
                              position: 'absolute',
                              bottom: '-10px',
                              left: '14px',
                              right: '14px',
                              height: '2px',
                              background: 'var(--brand-active)',
                              borderRadius: '1px',
                            }}
                          />
                        )}
                      </button>
                    ) : (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <button 
                            style={{
                              ...navButtonStyle,
                              color: location.pathname.startsWith('/release') ? 'var(--text-primary)' : navButtonStyle.color,
                              fontWeight: location.pathname.startsWith('/release') ? 600 : navButtonStyle.fontWeight,
                              background: location.pathname.startsWith('/release') ? 'var(--nav-active-bg)' : 'transparent',
                            }}
                            onMouseEnter={(e) => { if (!location.pathname.startsWith('/release')) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = location.pathname.startsWith('/release') ? 'var(--nav-active-bg)' : 'transparent'; }}
                          >
                            {item.label}
                            <ChevronDown style={{ width: '16px', height: '16px' }} />
                            {location.pathname.startsWith('/release') && (
                              <span 
                                style={{
                                  position: 'absolute',
                                  bottom: '-10px',
                                  left: '14px',
                                  right: '14px',
                                  height: '2px',
                                  background: 'var(--brand-active)',
                                  borderRadius: '1px',
                                }}
                              />
                            )}
                          </button>
                        </PopoverTrigger>
                        {activeDropdown === item.label && (
                          <PopoverContent className="p-0 w-auto" align="start">
                            <ReleaseDropdown onClose={() => setActiveDropdown(null)} />
                          </PopoverContent>
                        )}
                      </Popover>
                    )
                  ) : item.label === "Planner" ? (
                    // Planner: Direct navigation to planner boards
                    <button
                      style={{
                        ...navButtonStyle,
                        color: location.pathname.startsWith('/planner') ? 'hsl(var(--primary))' : navButtonStyle.color,
                        fontWeight: location.pathname.startsWith('/planner') ? 600 : navButtonStyle.fontWeight,
                        background: location.pathname.startsWith('/planner') ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!location.pathname.startsWith('/planner')) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = location.pathname.startsWith('/planner') ? 'hsl(var(--primary) / 0.08)' : 'transparent'; }}
                      onClick={() => navigate('/planner/boards')}
                    >
                      {item.label}
                      {location.pathname.startsWith('/planner') && (
                        <span 
                          style={{
                            position: 'absolute',
                            bottom: '-10px',
                            left: '14px',
                            right: '14px',
                            height: '2px',
                            background: 'var(--brand-active)',
                            borderRadius: '1px',
                          }}
                        />
                      )}
                    </button>
                  ) : item.label === "Releases" ? (
                    // Releases: Direct navigation with active state
                    <button
                      style={{
                        ...navButtonStyle,
                        color: location.pathname.startsWith('/releases') ? 'hsl(var(--primary))' : navButtonStyle.color,
                        fontWeight: location.pathname.startsWith('/releases') ? 600 : navButtonStyle.fontWeight,
                        background: location.pathname.startsWith('/releases') ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!location.pathname.startsWith('/releases')) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = location.pathname.startsWith('/releases') ? 'hsl(var(--primary) / 0.08)' : 'transparent'; }}
                      onClick={() => navigate('/releases/command-center')}
                    >
                      {item.label}
                      {location.pathname.startsWith('/releases') && (
                        <span 
                          style={{
                            position: 'absolute',
                            bottom: '-10px',
                            left: '14px',
                            right: '14px',
                            height: '2px',
                            background: 'var(--brand-active)',
                            borderRadius: '1px',
                          }}
                        />
                      )}
                    </button>
                  ) : (
                    <button
                      style={navButtonStyle}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--nav-active-bg)' : 'transparent'; }}
                      onClick={() => item.path && navigate(item.path)}
                    >
                      {item.label}
                      {activeUnderline}
                    </button>
                  )}
                </div>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden flex-1">
          <MobileNavigationMenu />
        </div>
        
        {/* ===== ACTIONS ZONE ===== */}
        <div className="flex items-center flex-shrink-0" style={{ gap: '8px' }}>
          {/* Create Button (Primary CTA) */}
          <CreateDropdown />
          
          <TooltipProvider>
            {/* Notifications */}
            <Tooltip>
              <TooltipTrigger asChild>
                <NotificationsPanel />
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>

            {/* Settings - 32x32 icon button - Only visible to Admin */}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: '6px',
                      background: 'transparent',
                      color: 'var(--icon-default)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
                      e.currentTarget.style.color = 'var(--icon-hover)';
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.background = 'transparent'; 
                      e.currentTarget.style.color = 'var(--icon-default)';
                    }}
                    onClick={() => navigate('/admin/activity')}
                    title="Settings"
                  >
                    <Settings style={{ width: '20px', height: '20px' }} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Search Button - visible control with keyboard shortcut hint */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "hidden sm:flex items-center gap-2 h-8 px-3 rounded-md border transition-all",
                "bg-[var(--surface-3)] border-[var(--border-default)] text-[var(--text-2)]",
                "hover:bg-[var(--surface-hover)] hover:border-[var(--border-accent)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-1)]"
              )}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Search Catalyst…</span>
              <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border px-1.5 text-[10px] font-medium border-[var(--border-color)] bg-[var(--surface-2)] text-[var(--text-3)]">
                ⌘K
              </kbd>
            </button>
            {/* Mobile search icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "sm:hidden flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                "text-[var(--icon-default)] hover:bg-[var(--nav-hover-bg)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1"
              )}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Theme Toggle - between Search and Avatar */}
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

      {/* Create Entity Dialog - lifted from dropdowns to prevent stacking */}
      {createDialogType && (
        <CreateEntityDialog
          open={true}
          onOpenChange={(open) => !open && setCreateDialogType(null)}
          entityType={createDialogType}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
}
