import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, User, ChevronDown, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
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
    { label: "Product", hasDropdown: true },
    { label: "Custom Rooms", hasDropdown: true },
    { label: "Starred", hasDropdown: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-2 sm:px-4 gap-1 sm:gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-2 sm:mr-4 cursor-pointer" onClick={() => navigate('/home')}>
            <span className="font-extrabold text-base sm:text-lg tracking-tight">
              <span className="text-foreground">Cata</span>
              <span className="text-brand-gold">lyst</span>
            </span>
          </div>

          {/* Main Navigation - Shown on all screens except small mobile */}
          <nav className="hidden sm:flex items-center gap-1 flex-1 overflow-x-auto">
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
                    <PopoverContent className="p-0 w-auto" align="start">
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
                    <PopoverContent className="p-0 w-auto" align="start">
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
                    <PopoverContent className="p-0 w-auto" align="start">
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
                    <PopoverContent className="p-0 w-auto" align="start">
                      <StarredDropdown onClose={() => setActiveDropdown(null)} />
                    </PopoverContent>
                  </Popover>
                ) : item.hasDropdown ? (
                  <DropdownMenu
                    open={activeDropdown === item.label}
                    onOpenChange={(open) => setActiveDropdown(open ? item.label : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-sm font-medium hover:bg-accent/50"
                      >
                        {item.label}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-popover">
                      <DropdownMenuItem className="text-muted-foreground text-xs">
                        TODO (needs confirmation)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-sm font-medium hover:bg-accent/50"
                    onClick={() => item.path && navigate(item.path)}
                  >
                    {item.label}
                  </Button>
                )}
              </div>
            ))}

            {/* Items Dropdown */}
            <ItemsDropdown />
          </nav>

          {/* Create Button */}
          <div className="hidden xs:block">
            <CreateDropdown />
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center gap-0.5 sm:gap-1 ml-auto">
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

              {/* Personas - Hidden on mobile */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden sm:block">
                    <PersonasPopover />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch Persona</p>
                </TooltipContent>
              </Tooltip>

              {/* Help - Hidden on mobile */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 tap-target">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Help</p>
                </TooltipContent>
              </Tooltip>

              {/* Search - Always visible */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 tap-target"
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
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full tap-target">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">User Account</p>
                  </div>
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
