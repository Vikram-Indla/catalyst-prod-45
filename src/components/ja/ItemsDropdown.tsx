import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useEnabledModules } from "@/hooks/useModules";
import { useNavigation } from "@/contexts/NavigationContext";
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

type WorkContext = 'enterprise' | 'program' | 'project' | 'product';

interface ItemConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  path: string;
  moduleCode: string | null;
}

// Define items for each context
const enterpriseItems: ItemConfig[] = [
  { label: "Themes", icon: Circle, color: "text-workitem-theme", path: "/themes", moduleCode: "PORTFOLIO" },
  { label: "Objectives", icon: Target, color: "text-brand-gold", path: "/enterprise/objectives", moduleCode: "ENTERPRISE" },
  { label: "Ideation", icon: Lightbulb, color: "text-warning-600", path: "/items/ideation", moduleCode: "PRODUCT" },
];

const programItems: ItemConfig[] = [
  { label: "Epics", icon: Square, color: "text-workitem-epic", path: "/items/epics", moduleCode: "PORTFOLIO" },
  { label: "Program Incidents", icon: AlertOctagon, color: "text-destructive", path: "/release/incidents", moduleCode: "PROGRAM" },
  { label: "Risks", icon: AlertTriangle, color: "text-destructive", path: "/enterprise/risks", moduleCode: "ENTERPRISE" },
  { label: "Dependencies", icon: GitBranch, color: "text-warning", path: "/dependencies", moduleCode: "PROGRAM" },
];

const projectItems: ItemConfig[] = [
  { label: "Sprints", icon: Calendar, color: "text-info", path: "/sprints", moduleCode: "PROGRAM" },
  { label: "Risks", icon: AlertTriangle, color: "text-destructive", path: "/enterprise/risks", moduleCode: "ENTERPRISE" },
  { label: "Dependencies", icon: GitBranch, color: "text-warning", path: "/dependencies", moduleCode: "PROGRAM" },
  { label: "Features", icon: Box, color: "text-workitem-feature", path: "/features", moduleCode: "PROGRAM" },
  { label: "Stories", icon: FileText, color: "text-workitem-story", path: "/stories", moduleCode: "TEAMS" },
  { label: "Defects", icon: Bug, color: "text-workitem-defect", path: "/items/defects", moduleCode: "TEAMS" },
  { label: "Tasks", icon: CheckSquare, color: "text-workitem-subtask", path: "/items/tasks", moduleCode: "TEAMS" },
  { label: "Incidents", icon: AlertOctagon, color: "text-destructive", path: "/release/incidents", moduleCode: "TEAMS" },
];

const productItems: ItemConfig[] = [
  { label: "Business Requests", icon: Square, color: "text-brand-gold", path: "/industry", moduleCode: "PRODUCT" },
];

// Other items that appear across multiple contexts
const otherItemsByContext: Record<WorkContext, ItemConfig[]> = {
  enterprise: [],
  program: [
    { label: "Program Increments", icon: Package, color: "text-workitem-theme", path: "/pis", moduleCode: "PROGRAM" },
  ],
  project: [
    { label: "Program Increments", icon: Package, color: "text-workitem-theme", path: "/pis", moduleCode: "PROGRAM" },
  ],
  product: [],
};

function getWorkContext(pathname: string, selectedProgramId: string | null, selectedProjectId: string | null): WorkContext {
  // Check route first
  if (pathname.startsWith('/enterprise') || pathname.startsWith('/strategy')) {
    return 'enterprise';
  }
  if (pathname.startsWith('/product') || pathname.startsWith('/industry')) {
    return 'product';
  }
  if (pathname.startsWith('/program')) {
    return 'program';
  }
  if (pathname.startsWith('/project')) {
    return 'project';
  }
  
  // Check selected context from navigation
  if (selectedProjectId) {
    return 'project';
  }
  if (selectedProgramId) {
    return 'program';
  }
  
  // Default to enterprise for home/generic routes
  return 'enterprise';
}

export function ItemsDropdown() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { isModuleEnabled } = useEnabledModules();
  const { selectedProgramId, selectedProjectId } = useNavigation();

  // Determine current work context
  const workContext = useMemo(() => 
    getWorkContext(location.pathname, selectedProgramId, selectedProjectId),
    [location.pathname, selectedProgramId, selectedProjectId]
  );

  // Get items based on context
  const contextWorkItems = useMemo(() => {
    switch (workContext) {
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
  }, [workContext]);

  const contextOtherItems = useMemo(() => 
    otherItemsByContext[workContext] || [],
    [workContext]
  );

  // Filter items based on enabled modules
  const filteredWorkItems = useMemo(() => 
    contextWorkItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [contextWorkItems, isModuleEnabled]
  );

  const filteredOtherItems = useMemo(() => 
    contextOtherItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [contextOtherItems, isModuleEnabled]
  );

  const handleItemClick = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  // Context label for the dropdown header
  const contextLabel = useMemo(() => {
    switch (workContext) {
      case 'enterprise':
        return 'Enterprise Items';
      case 'program':
        return 'Program Items';
      case 'project':
        return 'Project Items';
      case 'product':
        return 'Product Items';
      default:
        return 'Work Items';
    }
  }, [workContext]);

  // Don't render dropdown if no items are available
  if (filteredWorkItems.length === 0 && filteredOtherItems.length === 0) {
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
        {filteredWorkItems.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
              {contextLabel}
            </DropdownMenuLabel>
            {filteredWorkItems.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onClick={() => handleItemClick(item.path)}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-accent"
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm">{item.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {filteredWorkItems.length > 0 && filteredOtherItems.length > 0 && (
          <DropdownMenuSeparator className="my-2" />
        )}

        {filteredOtherItems.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
              Other
            </DropdownMenuLabel>
            {filteredOtherItems.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onClick={() => handleItemClick(item.path)}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-accent"
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm">{item.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
