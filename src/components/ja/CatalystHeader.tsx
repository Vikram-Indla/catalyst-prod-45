import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnabledModules } from "@/hooks/useModules";
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

  return (
    <>
      <header className="h-14 bg-white border-b border-[#e5e7eb] flex items-center px-4 sticky top-0 z-[100]">
        {/* ===== LOGO ZONE ===== */}
        <div 
          className="flex items-center mr-8 flex-shrink-0 cursor-pointer"
          onClick={() => navigate('/home')}
        >
          <span className="text-[22px] font-bold tracking-tight">
            <span className="text-[#5c7c5c]">Cata</span>
            <span className="text-[#c69c6d]">lyst</span>
          </span>
        </div>
        
        {/* ===== NAVIGATION ZONE ===== */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          <TooltipProvider>
            {navItems.map((item) => {
              // Disabled module rendering
              if (!item.isEnabled) {
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <button
                        className="h-9 px-3 text-sm font-medium text-[#374151] opacity-40 cursor-not-allowed rounded-md flex items-center gap-1"
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
              const navButtonClass = cn(
                "h-9 px-3 text-sm rounded-md flex items-center gap-1 transition-colors relative",
                isActive 
                  ? "text-[#c69c6d] font-semibold" 
                  : "text-[#374151] font-medium hover:bg-[#f3f4f6]"
              );
              
              // Active underline indicator
              const activeUnderline = isActive ? (
                <span className="absolute -bottom-[10px] left-3 right-3 h-0.5 bg-[#c69c6d] rounded-sm" />
              ) : null;
              
              return (
                <div key={item.label} className="inline-flex items-center relative">
                  {item.label === "Product" ? (
                    <Popover
                      open={activeDropdown === item.label}
                      onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                    >
                      <PopoverTrigger asChild>
                        <button className={navButtonClass}>
                          {item.label}
                          <ChevronDown className="w-4 h-4" />
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
                  ) : item.label === "Program" ? (
                    <Popover
                      open={activeDropdown === item.label}
                      onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                    >
                      <PopoverTrigger asChild>
                        <button className={navButtonClass}>
                          {item.label}
                          <ChevronDown className="w-4 h-4" />
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
                  ) : item.label === "Project" ? (
                    <Popover
                      open={activeDropdown === item.label}
                      onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                    >
                      <PopoverTrigger asChild>
                        <button className={navButtonClass}>
                          {item.label}
                          <ChevronDown className="w-4 h-4" />
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
                  ) : item.label === "Release" ? (
                    <Popover
                      open={activeDropdown === item.label}
                      onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                    >
                      <PopoverTrigger asChild>
                        <button className={cn(
                          navButtonClass,
                          location.pathname.startsWith('/release') && "text-[#c69c6d] font-semibold"
                        )}>
                          {item.label}
                          <ChevronDown className="w-4 h-4" />
                          {location.pathname.startsWith('/release') && (
                            <span className="absolute -bottom-[10px] left-3 right-3 h-0.5 bg-[#c69c6d] rounded-sm" />
                          )}
                        </button>
                      </PopoverTrigger>
                      {activeDropdown === item.label && (
                        <PopoverContent className="p-0 w-auto" align="start">
                          <ReleaseDropdown onClose={() => setActiveDropdown(null)} />
                        </PopoverContent>
                      )}
                    </Popover>
                  ) : (
                    <button
                      className={navButtonClass}
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
        <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#374151] transition-colors"
                  onClick={() => navigate('/admin/activity')}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>

            {/* Search */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#374151] transition-colors"
                  onClick={() => setIsSearchOpen(true)}
                  title="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Search (Ctrl+K)</p>
              </TooltipContent>
            </Tooltip>

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
