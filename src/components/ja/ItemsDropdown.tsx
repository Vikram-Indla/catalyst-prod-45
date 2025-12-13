import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useEnabledModules } from "@/hooks/useModules";
import { useCatalystContext } from "@/contexts/CatalystContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Circle, Square, Box, FileText, Bug, CheckSquare, Target, 
  GitBranch, Lightbulb, AlertTriangle, Calendar, Package, AlertOctagon 
} from "lucide-react";
import { WorkspaceType } from "@/lib/workspaceContext";

interface ItemConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  path: string;
  moduleCode: string | null;
}

// Enterprise Items
const enterpriseItems: ItemConfig[] = [
  { label: "Themes", icon: Circle, color: "text-workitem-theme", path: "/themes", moduleCode: "PORTFOLIO" },
  { label: "Objectives", icon: Target, color: "text-brand-gold", path: "/enterprise/okr-hub", moduleCode: "ENTERPRISE" },
  { label: "Ideation", icon: Lightbulb, color: "text-warning-600", path: "/items/ideation", moduleCode: "PRODUCT" },
];

// Program Items - Epics, Risks, Dependencies only (no Program Incidents)
const programItems: ItemConfig[] = [
  { label: "Epics", icon: Square, color: "text-workitem-epic", path: "/items/epics", moduleCode: "PORTFOLIO" },
  { label: "Risks", icon: AlertTriangle, color: "text-destructive", path: "/enterprise/risks", moduleCode: "ENTERPRISE" },
  { label: "Dependencies", icon: GitBranch, color: "text-warning", path: "/dependencies", moduleCode: "PROGRAM" },
];

// Project Items - NO Epics, NO Program Incidents, Quarters instead of PI
const projectItems: ItemConfig[] = [
  { label: "Features", icon: Box, color: "text-workitem-feature", path: "/features", moduleCode: "PROGRAM" },
  { label: "Stories", icon: FileText, color: "text-workitem-story", path: "/stories", moduleCode: "TEAMS" },
  { label: "Defects", icon: Bug, color: "text-workitem-defect", path: "/items/defects", moduleCode: "TEAMS" },
  { label: "Incidents", icon: AlertOctagon, color: "text-destructive", path: "/release/incidents", moduleCode: "TEAMS" },
  { label: "Risks", icon: AlertTriangle, color: "text-destructive", path: "/enterprise/risks", moduleCode: "ENTERPRISE" },
  { label: "Dependencies", icon: GitBranch, color: "text-warning", path: "/dependencies", moduleCode: "PROGRAM" },
  { label: "Quarters", icon: Calendar, color: "text-info", path: "/quarters", moduleCode: "PROGRAM" },
];

// Product Items
const productItems: ItemConfig[] = [
  { label: "Business Requests", icon: Square, color: "text-brand-gold", path: "/industry/backlog", moduleCode: "PRODUCT" },
];

// Get context label
function getContextLabel(workspaceType: WorkspaceType): string {
  switch (workspaceType) {
    case 'enterprise':
      return 'ENTERPRISE ITEMS';
    case 'program':
      return 'PROGRAM ITEMS';
    case 'project':
      return 'PROJECT ITEMS';
    case 'product':
      return 'PRODUCT ITEMS';
    default:
      return 'WORK ITEMS';
  }
}

// Get items for workspace type
function getItemsForContext(workspaceType: WorkspaceType): ItemConfig[] {
  switch (workspaceType) {
    case 'enterprise':
      return enterpriseItems;
    case 'program':
      return programItems;
    case 'project':
      return projectItems;
    case 'product':
      return productItems;
    default:
      return enterpriseItems;
  }
}

export function ItemsDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { isModuleEnabled } = useEnabledModules();
  const { workspaceType, projectId, programId } = useCatalystContext();

  // Get items based on workspace context
  const contextItems = useMemo(() => 
    getItemsForContext(workspaceType),
    [workspaceType]
  );

  // Get context label
  const contextLabel = useMemo(() => 
    getContextLabel(workspaceType),
    [workspaceType]
  );

  // Filter items based on enabled modules
  const filteredItems = useMemo(() => 
    contextItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [contextItems, isModuleEnabled]
  );

  // Check if context requires selection
  const needsSelection = useMemo(() => {
    if (workspaceType === 'project' && !projectId) {
      return 'Select a Project to view Project Items';
    }
    if (workspaceType === 'program' && !programId) {
      return 'Select a Program to view Program Items';
    }
    return null;
  }, [workspaceType, projectId, programId]);

  const handleItemClick = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  // Don't render dropdown if no items are available
  if (filteredItems.length === 0 && !needsSelection) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-sm font-medium hover:bg-accent/50"
        >
          Items
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 max-h-[600px] overflow-y-auto bg-popover z-50"
      >
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
          {contextLabel}
        </DropdownMenuLabel>
        
        {needsSelection ? (
          <DropdownMenuItem disabled className="text-muted-foreground text-sm py-3">
            {needsSelection}
          </DropdownMenuItem>
        ) : (
          filteredItems.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onClick={() => handleItemClick(item.path)}
              className="flex items-center gap-3 py-2 cursor-pointer hover:bg-accent"
            >
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <span className="text-sm">{item.label}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
