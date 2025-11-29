import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemsDropdown } from "./ItemsDropdown";
import { CreateDropdown } from "./CreateDropdown";
import { SearchOverlay } from "./SearchOverlay";
import { NotificationsPanel } from "./NotificationsPanel";
import { PersonasPopover } from "./PersonasPopover";
import { PortfolioSelectorDropdown } from "./PortfolioSelectorDropdown";
import { ProgramSelectorDropdown } from "./ProgramSelectorDropdown";
import { TeamSelectorDropdown } from "./TeamSelectorDropdown";
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

export function JiraAlignHeader() {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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
        <div className="flex h-14 items-center px-4 gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">JA</span>
            </div>
            <span className="font-semibold text-sm hidden md:inline">Catalyst</span>
          </div>

          {/* Main Navigation */}
          <nav className="flex items-center gap-1 flex-1">
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
          <CreateDropdown />

          {/* Right Side Icons */}
          <div className="flex items-center gap-1 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NotificationsPanel />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <PersonasPopover />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch Persona</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Help</p>
                </TooltipContent>
              </Tooltip>

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
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
