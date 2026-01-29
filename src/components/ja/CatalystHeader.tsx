import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown, LogOut, Settings, Bell, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnabledModules } from "@/hooks/useModules";
import { useModuleAccess } from "@/hooks/useModuleAccess";
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
import { useAppHeaderOffset } from "@/hooks/useAppHeaderOffset";

export function CatalystHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const { isAdmin, isSuperAdmin, isProgramManager, canAccessEnterprise, isProductOwnerOnly } = useUserRole();
  
  // Settings access: admin, super_admin, or program_manager (management)
  const canAccessSettings = isAdmin || isSuperAdmin || isProgramManager;
  const { isModuleEnabled, isLoading: modulesLoading } = useEnabledModules();
  const { canViewInNav, isLoading: accessLoading } = useModuleAccess();
  const { workspaceType } = useCatalystContext();
  const singleItemNav = useSingleItemNavigation();
  
  // Get active nav item based on workspace context
  const activeNavItem = getActiveNavItem(workspaceType);

  // Keep global --app-header-h / --app-top-offset in sync with real header height
  useAppHeaderOffset(headerRef);

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

  // Close avatar menu on outside click / Escape
  useEffect(() => {
    if (!userMenuOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (userMenuRef.current?.contains(target)) return;
      setUserMenuOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenuOpen]);

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

  // Define nav items with their module keys (must match admin_nav_modules.module_key)
  const allNavItems = [
    { label: "Home", path: "/for-you", moduleKey: "home", visibleToProductOwner: true },
    { label: "Enterprise", path: "/enterprise/strategy-room", moduleKey: "enterprise", requiresEnterpriseAccess: true, visibleToProductOwner: true },
    { label: "Product", hasDropdown: true, moduleKey: "product", visibleToProductOwner: true },
    { label: "Project", isLabel: true, moduleKey: "project", visibleToProductOwner: true },
    { label: "Releases", path: "/releases/command-center", moduleKey: "releases", visibleToProductOwner: false },
    { label: "Operations", hasDropdown: true, path: "/release", moduleKey: "operations", visibleToProductOwner: false },
    { label: "Taskboard", path: "/planner/boards", moduleKey: "planner", visibleToProductOwner: true },
  ];

  // Get all nav items with their enabled status based on role-based module access
  // Uses canViewInNav which returns true for 'full' or 'view' access levels
  const navItems = allNavItems
    .filter(item => !isProductOwnerOnly || item.visibleToProductOwner)
    .map(item => ({
      ...item,
      isEnabled: item.requiresEnterpriseAccess 
        ? canViewInNav(item.moduleKey) && canAccessEnterprise
        : canViewInNav(item.moduleKey),
    }))
    .filter(item => item.isEnabled); // Only show items user can view in nav

  

  return (
    <>
      {/* TopNav: 56px fixed height, theme-aware bg, elevation + bottom border for enterprise frame */}
      <header
        ref={headerRef}
        className="sticky top-0 z-[100] flex items-center"
        style={{
          // Safe-area aware header height contract
          height: 'calc(56px + var(--app-safe-top))',
          paddingTop: 'var(--app-safe-top)',
          paddingLeft: '16px',
          paddingRight: '16px',
          borderBottom: '1px solid var(--divider)',
          fontFamily: "var(--font-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
          backgroundColor: 'var(--nav-bg)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
          // GPU layer promotion to prevent flicker when portals mount
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* ===== LOGO ZONE — Convergence Hub Mark + Bold Wordmark (Commercial SaaS) ===== */}
        <a 
          className="flex items-center gap-3 flex-shrink-0 cursor-pointer no-underline rounded-lg transition-colors p-2 -m-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          style={{ marginRight: '32px' }}
          onClick={() => navigate('/home')}
        >
          {/* Convergence Hub Logo — 32×32 per commercial spec, theme-aware */}
          <svg 
            className="w-8 h-8 flex-shrink-0" 
            viewBox="0 0 100 100" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#1d4ed8"/>
              </linearGradient>
            </defs>
            {/* Connection lines */}
            <line x1="50" y1="50" x2="22" y2="22" stroke="#93c5fd" strokeWidth="5" strokeLinecap="round"/>
            <line x1="50" y1="50" x2="78" y2="22" stroke="#93c5fd" strokeWidth="5" strokeLinecap="round"/>
            <line x1="50" y1="50" x2="22" y2="78" stroke="#93c5fd" strokeWidth="5" strokeLinecap="round"/>
            <line x1="50" y1="50" x2="78" y2="78" stroke="#93c5fd" strokeWidth="5" strokeLinecap="round"/>
            {/* Outer nodes */}
            <circle cx="22" cy="22" r="12" fill="url(#logoGrad)"/>
            <circle cx="78" cy="22" r="12" fill="url(#logoGrad)"/>
            <circle cx="22" cy="78" r="12" fill="url(#logoGrad)"/>
            <circle cx="78" cy="78" r="12" fill="url(#logoGrad)"/>
            {/* Center hub */}
            <circle cx="50" cy="50" r="18" fill="url(#logoGrad)"/>
            <circle cx="50" cy="50" r="9" fill="white"/>
          </svg>
          {/* Wordmark — BOLD 18px (commercial SaaS spec) */}
          <span 
            className="text-zinc-950 dark:text-white"
            style={{ 
              fontSize: '18px', 
              fontWeight: 700, 
              letterSpacing: '-0.025em',
            }}
          >
            Catalyst
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
              
              // TopNav item styles — COMMERCIAL SAAS (bold contrast, larger targets)
              // Theme-aware colors using CSS variables
              const navButtonStyle: React.CSSProperties = {
                height: '36px',
                padding: '0 14px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563EB' : 'var(--nav-text)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: 'none',
                background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                position: 'relative' as const,
                fontFamily: 'inherit',
                outline: 'none',
              };
              
              // Active underline indicator - 2px blue underline
              const activeUnderline = isActive ? (
                <span 
                  style={{
                    position: 'absolute',
                    bottom: '-10px',
                    left: '14px',
                    right: '14px',
                    height: '2px',
                    background: '#2563EB',
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
                  ) : item.label === "Taskboard" ? (
                    // Taskboard: Direct navigation to planner boards
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
                  ) : (item as any).isLabel ? (
                    // Label-only nav item (no interaction, just display)
                    <span
                      style={{
                        height: '36px',
                        padding: '0 14px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--nav-text)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6,
                        cursor: 'default',
                      }}
                    >
                      {item.label}
                    </span>
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

            {/* Settings — 40×40 icon button (Commercial SaaS spec) */}
            {canAccessSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="relative flex items-center justify-center w-10 h-10 rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
                    onClick={() => navigate('/admin/users')}
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Search Trigger — PROMINENT (Commercial SaaS: 40px height, 240px min width) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "hidden sm:flex items-center gap-2 h-10 px-4 rounded-lg transition-all",
                "bg-zinc-100 dark:bg-zinc-800 border border-transparent",
                "hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-200 dark:hover:border-zinc-600",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              )}
              style={{ minWidth: '240px' }}
            >
              <Search className="h-4 w-4 text-zinc-500" />
              <span className="text-sm flex-1 text-left text-zinc-500">
                Search anything...
              </span>
              <div className="flex gap-1">
                <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded text-[11px] font-medium text-zinc-400">
                  ⌘
                </kbd>
                <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded text-[11px] font-medium text-zinc-400">
                  K
                </kbd>
              </div>
            </button>
            {/* Mobile search icon — 40×40 */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "sm:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              )}
            >
              <Search className="h-5 w-5" />
            </button>


            {/* User Avatar */}
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "text-primary-foreground text-[13px] font-semibold",
                  "cursor-pointer transition-transform hover:scale-105",
                  "bg-gradient-to-br from-primary to-primary/80",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
                title="Profile"
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  aria-label="User menu"
                  className={cn(
                    "absolute right-0 top-full mt-2",
                    "z-[9999] w-56",
                    "rounded-md border border-border/50 bg-popover text-popover-foreground shadow-lg",
                    "p-1"
                  )}
                >
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">User Account</p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/profile');
                    }}
                    className={cn(
                      "w-full flex items-center rounded-sm px-2 py-1.5 text-sm",
                      "transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/admin/settings/notifications');
                    }}
                    className={cn(
                      "w-full flex items-center rounded-sm px-2 py-1.5 text-sm",
                      "transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notification Settings</span>
                  </button>

                  {canAccessSettings && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/admin/users');
                      }}
                      className={cn(
                        "w-full flex items-center rounded-sm px-2 py-1.5 text-sm",
                        "transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus:bg-accent focus:text-accent-foreground"
                      )}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Administration</span>
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void handleSignOut();
                    }}
                    className={cn(
                      "w-full flex items-center rounded-sm px-2 py-1.5 text-sm",
                      "transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
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
