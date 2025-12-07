import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { CreateDropdown } from "./CreateDropdown";
import { ItemsDropdown } from "./ItemsDropdown";
import { PortfolioSelectorDropdown } from "./PortfolioSelectorDropdown";
import { ProgramSelectorDropdown } from "./ProgramSelectorDropdown";
import { TeamSelectorDropdown } from "./TeamSelectorDropdown";
import { StarredDropdown } from "./StarredDropdown";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function MobileNavigationMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-extrabold text-xl tracking-tight">
              <span className="text-foreground">Cata</span>
              <span className="text-brand-gold">lyst</span>
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 py-4">
            {/* Home */}
            <Button
              variant="ghost"
              className="w-full justify-start px-6 py-3 text-base font-medium"
              onClick={() => handleNavigate('/home')}
            >
              Home
            </Button>

            {/* Enterprise */}
            <Button
              variant="ghost"
              className="w-full justify-start px-6 py-3 text-base font-medium"
              onClick={() => handleNavigate('/enterprise/strategy-room')}
            >
              Enterprise
            </Button>

            {/* Portfolio */}
            <Collapsible
              open={activeSection === 'portfolio'}
              onOpenChange={() => toggleSection('portfolio')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-6 py-3 text-base font-medium"
                >
                  Portfolio
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      activeSection === 'portfolio' ? 'rotate-90' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4">
                <div onClick={() => setOpen(false)}>
                  <PortfolioSelectorDropdown onClose={() => setOpen(false)} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Project */}
            <Collapsible
              open={activeSection === 'program'}
              onOpenChange={() => toggleSection('program')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-6 py-3 text-base font-medium"
                >
                  Project
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      activeSection === 'program' ? 'rotate-90' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4">
                <div onClick={() => setOpen(false)}>
                  <ProgramSelectorDropdown onClose={() => setOpen(false)} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Team */}
            <Collapsible
              open={activeSection === 'team'}
              onOpenChange={() => toggleSection('team')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-6 py-3 text-base font-medium"
                >
                  Team
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      activeSection === 'team' ? 'rotate-90' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4">
                <div onClick={() => setOpen(false)}>
                  <TeamSelectorDropdown onClose={() => setOpen(false)} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Starred */}
            <Collapsible
              open={activeSection === 'starred'}
              onOpenChange={() => toggleSection('starred')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-6 py-3 text-base font-medium"
                >
                  Starred
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      activeSection === 'starred' ? 'rotate-90' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4">
                <div onClick={() => setOpen(false)}>
                  <StarredDropdown onClose={() => setOpen(false)} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-4" />

            {/* Create Dropdown */}
            <div className="px-6 py-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">ACTIONS</p>
              <div onClick={() => setOpen(false)}>
                <CreateDropdown />
              </div>
            </div>

            {/* Items Dropdown */}
            <div className="px-6 py-2">
              <div onClick={() => setOpen(false)}>
                <ItemsDropdown />
              </div>
            </div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
