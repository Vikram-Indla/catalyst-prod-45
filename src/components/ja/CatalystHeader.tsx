import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, HelpCircle, User, ChevronDown, LogOut, Settings, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnabledModules } from "@/hooks/useModules";
import { Button } from "@/components/ui/button";
import { ItemsDropdown } from "./ItemsDropdown";
import { CreateDropdown } from "./CreateDropdown";
import { SearchOverlay } from "./SearchOverlay";
import { NotificationsPanel } from "./NotificationsPanel";
import { PersonasPopover } from "./PersonasPopover";
import { PortfolioSelectorDropdown } from "./PortfolioSelectorDropdown";
import { ProgramSelectorDropdown } from "./ProgramSelectorDropdown";
import { TeamSelectorDropdown } from "./TeamSelectorDropdown";
import { StarredDropdown } from "./StarredDropdown";
import { ProductSelectorDropdown } from "./ProductSelectorDropdown";
import { MobileNavigationMenu } from "./MobileNavigationMenu";
import { TestsDropdown } from "./TestsDropdown";
import { catalystToast } from "@/lib/catalystToast";
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

export function CatalystHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { isAdmin } = useUserRole();
  const { isModuleEnabled, isLoading: modulesLoading } = useEnabledModules();

  // Show Tests dropdown only when in program context with tests visible
  const isProgramRoute = location.pathname.startsWith('/programs/');
  const isTestsRoute = location.pathname.includes('/tests');
  const showTestsDropdown = isProgramRoute && isTestsRoute;

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
    { label: "Enterprise", path: "/enterprise/strategy-room", moduleCode: "ENTERPRISE" },
    { label: "Product", hasDropdown: true, moduleCode: "PRODUCT" },
    { label: "Portfolio", hasDropdown: true, moduleCode: "PORTFOLIO" },
    { label: "Program", hasDropdown: true, moduleCode: "PROGRAM" },
    { label: "Team", hasDropdown: true, path: "/teams", moduleCode: "TEAMS" },
  ];

  // Get all nav items with their enabled status
  const navItems = allNavItems.map(item => ({
    ...item,
    isEnabled: item.moduleCode === null ? true : isModuleEnabled(item.moduleCode),
  }));

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        {/* CSS Grid: Logo | Nav (left-aligned) | Actions (right-aligned) */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-14 sm:h-16 px-4 sm:px-6">
          {/* Left Column: Mobile Menu + Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <MobileNavigationMenu />
            <div 
              className="flex items-center cursor-pointer h-10"
              onClick={() => navigate('/home')}
            >
              <span 
                className="font-semibold whitespace-nowrap leading-none"
                style={{ 
                  fontSize: '20px', 
                  letterSpacing: '-0.02em',
                }}
              >
                <span className="text-foreground">Cata</span>
                <span className="text-brand-gold">lyst</span>
              </span>
            </div>
          </div>

          {/* Middle Column: Main Navigation - packed left with consistent gap */}
          <nav className="hidden md:flex items-center justify-start gap-4 ml-6 overflow-x-auto">
            <TooltipProvider>
              {navItems.map((item) => {
                // Disabled module rendering
                if (!item.isEnabled) {
                  return (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-10 px-[10px] py-0 text-sm font-medium opacity-40 cursor-not-allowed hover:bg-transparent rounded-lg inline-flex items-center gap-2 leading-none"
                          onClick={() => handleDisabledModuleClick(item.label)}
                        >
                          {item.label}
                        </Button>
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

                // Enabled module rendering - consistent h-10 control height with proper alignment
                const navButtonClass = "h-10 px-[10px] py-0 text-sm font-medium hover:bg-accent/50 rounded-lg inline-flex items-center gap-2 leading-none whitespace-nowrap";
                
                return (
                  <div key={item.label} className="inline-flex items-center">
                    {item.label === "Product" ? (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className={navButtonClass}>
                            {item.label}
                            <ChevronDown className="h-3 w-3 block" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto z-[60]" align="start">
                          <ProductSelectorDropdown onClose={() => setActiveDropdown(null)} />
                        </PopoverContent>
                      </Popover>
                    ) : item.label === "Portfolio" ? (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className={navButtonClass}>
                            {item.label}
                            <ChevronDown className="h-3 w-3 block" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto z-[60]" align="start">
                          <PortfolioSelectorDropdown onClose={() => setActiveDropdown(null)} />
                        </PopoverContent>
                      </Popover>
                    ) : item.label === "Program" ? (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className={navButtonClass}>
                            {item.label}
                            <ChevronDown className="h-3 w-3 block" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto z-[60]" align="start">
                          <ProgramSelectorDropdown onClose={() => setActiveDropdown(null)} />
                        </PopoverContent>
                      </Popover>
                    ) : item.label === "Team" && item.path ? (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className={navButtonClass}>
                            {item.label}
                            <ChevronDown className="h-3 w-3 block" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto z-[60]" align="start">
                          <TeamSelectorDropdown onClose={() => setActiveDropdown(null)} />
                        </PopoverContent>
                      </Popover>
                    ) : item.label === "Starred" ? (
                      <Popover
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className={navButtonClass}>
                            {item.label}
                            <ChevronDown className="h-3 w-3 block" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto z-[60]" align="start">
                          <StarredDropdown onClose={() => setActiveDropdown(null)} />
                        </PopoverContent>
                      </Popover>
                    ) : item.hasDropdown ? (
                      <DropdownMenu
                        open={activeDropdown === item.label}
                        onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className={navButtonClass}>
                            {item.label}
                            <ChevronDown className="h-3 w-3 block" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-popover z-[60]">
                          <DropdownMenuItem className="text-muted-foreground text-xs">
                            TODO (needs confirmation)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="ghost"
                        className={navButtonClass}
                        onClick={() => item.path && navigate(item.path)}
                      >
                        {item.label}
                      </Button>
                    )}
                  </div>
                );
              })}
            </TooltipProvider>

            {/* Tests Dropdown - Only visible in program context */}
            {showTestsDropdown && <TestsDropdown isActive />}

            {/* Items Dropdown - After Starred */}
            <ItemsDropdown />
          </nav>

          {/* Right Column: Actions - justify-self-end keeps it right-aligned */}
          <div className="flex items-center gap-3 justify-self-end">
            {/* Create Button - Always visible */}
            <CreateDropdown />

            <TooltipProvider>
              {/* Notifications - h-10 w-10 for consistent control size */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <NotificationsPanel />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>

              {/* Settings - Fixed square control */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 grid place-items-center rounded-full"
                    onClick={() => navigate('/admin/activity')}
                  >
                    <Settings className="h-5 w-5 block" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>

              {/* Search - Fixed square control */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 grid place-items-center rounded-full"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="h-5 w-5 block" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search (Ctrl+K)</p>
                </TooltipContent>
              </Tooltip>

              {/* User Profile Menu - Fixed square control */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full grid place-items-center">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-brand-gold text-background text-sm font-semibold">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover z-[60]">
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
        </div>
      </header>

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
