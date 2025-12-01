import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, User, ChevronDown, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
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
import { MobileNavigationMenu } from "./MobileNavigationMenu";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { isAdmin } = useUserRole();

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

  const navItems = [
    { label: "Home", path: "/home" },
    { label: "Enterprise", path: "/enterprise/strategy-room" },
    { label: "Portfolio", hasDropdown: true },
    { label: "Program", hasDropdown: true },
    { label: "Team", hasDropdown: true, path: "/teams" },
    { label: "Tests", hasDropdown: true },
    { label: "Product", hasDropdown: true },
    { label: "Custom Rooms", hasDropdown: true },
    { label: "Starred", hasDropdown: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-3 sm:px-6 gap-3">
          {/* Mobile Menu and Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <MobileNavigationMenu />
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
              <span className="font-extrabold text-xl tracking-tight whitespace-nowrap">
                <span className="text-foreground">Cata</span>
                <span className="text-brand-gold">lyst</span>
              </span>
            </div>
          </div>

          {/* Main Navigation - Visible on tablet and up */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center max-w-4xl">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.label === "Portfolio" ? (
                  <Popover
                    open={activeDropdown === item.label}
                    onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-sm font-medium hover:bg-accent/50"
                      >
                        {item.label}
                        <ChevronDown className="ml-1 h-3 w-3" />
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-sm font-medium hover:bg-accent/50"
                      >
                        {item.label}
                        <ChevronDown className="ml-1 h-3 w-3" />
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-sm font-medium hover:bg-accent/50"
                      >
                        {item.label}
                        <ChevronDown className="ml-1 h-3 w-3" />
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-sm font-medium hover:bg-accent/50"
                      >
                        {item.label}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto z-[60]" align="start">
                      <StarredDropdown onClose={() => setActiveDropdown(null)} />
                    </PopoverContent>
                  </Popover>
                ) : item.label === "Tests" ? (
                  <DropdownMenu
                    open={activeDropdown === item.label}
                    onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-sm font-medium hover:bg-accent/50 whitespace-nowrap"
                      >
                        {item.label}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-popover z-[60]">
                      <DropdownMenuItem onClick={() => navigate('/tests/cases')} className="cursor-pointer">
                        Test Cases
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/tests/cycles')} className="cursor-pointer">
                        Test Cycles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/tests/reports')} className="cursor-pointer">
                        Test Reports
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : item.hasDropdown ? (
                  <DropdownMenu
                    open={activeDropdown === item.label}
                    onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-sm font-medium hover:bg-accent/50 whitespace-nowrap"
                      >
                        {item.label}
                        <ChevronDown className="ml-1 h-3 w-3" />
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
                    size="sm"
                    className="h-9 px-3 text-sm font-medium hover:bg-accent/50 whitespace-nowrap"
                    onClick={() => item.path && navigate(item.path)}
                  >
                    {item.label}
                  </Button>
                )}
              </div>
            ))}
          </nav>

          {/* Right Side Actions - Compact on mobile, full on desktop */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Create Button - Always visible */}
            <CreateDropdown />

            {/* Items Dropdown - Tablet and up */}
            <div className="hidden md:block">
              <ItemsDropdown />
            </div>

            <TooltipProvider>
              {/* Notifications - Always visible */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <NotificationsPanel />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>

              {/* Search - Always visible */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search (Ctrl+K)</p>
                </TooltipContent>
              </Tooltip>

              {/* User Profile Menu - Always visible */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
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
