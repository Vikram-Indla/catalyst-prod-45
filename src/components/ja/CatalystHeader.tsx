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
import { SearchOverlay } from "./SearchOverlay";
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
  const { isAdmin, canAccessEnterprise } = useUserRole();
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error: any) {
      toast.error('Error signing out: ' + error.message);
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
    { label: "Home", path: "/home", moduleCode: null }, // Always visible
    { label: "Enterprise", path: "/enterprise/strategy-room", moduleCode: "ENTERPRISE", requiresEnterpriseAccess: true },
    { label: "Product", hasDropdown: true, moduleCode: "PRODUCT" },
    { label: "Program", hasDropdown: true, moduleCode: "PORTFOLIO" },
    { label: "Project", hasDropdown: true, moduleCode: "PROGRAM" },
    { label: "Release", hasDropdown: true, path: "/release", moduleCode: null }, // Always visible
  ];

  // Get all nav items with their enabled status
  // Enterprise requires both module enabled AND role-based access (admin, super_admin, product_admin, general_manager)
  const navItems = allNavItems.map(item => ({
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
      {/* TopNav: 56px fixed height, theme-aware bg, 1px bottom border */}
      <header 
        className="sticky top-0 z-[100] flex items-center"
        style={{ 
          height: '56px', 
          borderBottom: '1px solid var(--border)',
          padding: '0 16px',
          fontFamily: "var(--font-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
          backgroundColor: 'var(--nav-bg)',
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
            <span style={{ color: '#5c7c5c' }}>Cata</span>
            <span style={{ color: '#c69c6d' }}>lyst</span>
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
                          color: '#374151',
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
              
              // TopNav item styles matching reference exactly
              // Active nav items use olive green (#5c7c5c) for consistency
              const navButtonStyle: React.CSSProperties = {
                height: '36px',
                padding: '0 14px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#5c7c5c' : '#374151',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: 'none',
                background: 'transparent',
                position: 'relative' as const,
                fontFamily: 'inherit',
              };
              
              // Active underline indicator - positioned under text (olive green)
              const activeUnderline = isActive ? (
                <span 
                  style={{
                    position: 'absolute',
                    bottom: '-10px',
                    left: '14px',
                    right: '14px',
                    height: '2px',
                    background: '#5c7c5c',
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
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                          color: location.pathname.startsWith('/release') ? '#5c7c5c' : navButtonStyle.color,
                          fontWeight: location.pathname.startsWith('/release') ? 600 : navButtonStyle.fontWeight,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                              background: '#5c7c5c',
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
                              color: location.pathname.startsWith('/release') ? '#5c7c5c' : navButtonStyle.color,
                              fontWeight: location.pathname.startsWith('/release') ? 600 : navButtonStyle.fontWeight,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                                  background: '#5c7c5c',
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
                  ) : (
                    <button
                      style={navButtonStyle}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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

            {/* Settings - 32x32 icon button */}
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
                    color: '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.background = '#f3f4f6'; 
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = 'transparent'; 
                    e.currentTarget.style.color = '#6b7280';
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

            {/* Search - 32x32 icon button */}
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
                    color: '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.background = '#f3f4f6'; 
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = 'transparent'; 
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  onClick={() => setIsSearchOpen(true)}
                  title="Search"
                >
                  <Search style={{ width: '20px', height: '20px' }} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Search (Ctrl+K)</p>
              </TooltipContent>
            </Tooltip>

            {/* Theme Toggle - between Search and Avatar */}
            <ThemeToggle />

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-semibold cursor-pointer transition-transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #c69c6d 0%, #8b7355 100%)' }}
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

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

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
