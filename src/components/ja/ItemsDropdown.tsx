import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useEnabledModules } from "@/hooks/useModules";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Circle, Square, Box, FileText, Bug, CheckSquare, Target, GitBranch, Lightbulb, AlertTriangle, Calendar, Package, AlertOctagon } from "lucide-react";

// Module mapping for each item - null means always visible
const workItems = [
  { label: "Themes", icon: Circle, color: "text-workitem-theme", path: "/themes", moduleCode: "PORTFOLIO" },
  { label: "Business Request", icon: Square, color: "text-brand-gold", path: "/industry", moduleCode: "PRODUCT" },
  { label: "Epics", icon: Square, color: "text-workitem-epic", path: "/items/epics", moduleCode: "PORTFOLIO" },
  { label: "Features", icon: Box, color: "text-workitem-feature", path: "/features", moduleCode: "PROGRAM" },
  { label: "Stories", icon: FileText, color: "text-workitem-story", path: "/stories", moduleCode: "TEAMS" },
  { label: "Defects", icon: Bug, color: "text-workitem-defect", path: "/items/defects", moduleCode: "TEAMS" },
  { label: "Tasks", icon: CheckSquare, color: "text-workitem-subtask", path: "/items/tasks", moduleCode: "TEAMS" },
  { label: "Incidents", icon: AlertOctagon, color: "text-destructive", path: "/release/incidents", moduleCode: "TEAMS" },
];

const otherItems = [
  { label: "Objectives", icon: Target, color: "text-brand-gold", path: "/enterprise/objectives", moduleCode: "ENTERPRISE" },
  { label: "Dependencies", icon: GitBranch, color: "text-warning", path: "/dependencies", moduleCode: "PROGRAM" },
  { label: "Ideation", icon: Lightbulb, color: "text-warning-600", path: "/items/ideation", moduleCode: "PRODUCT" },
  { label: "Risks", icon: AlertTriangle, color: "text-destructive", path: "/enterprise/risks", moduleCode: "ENTERPRISE" },
  { label: "Sprints", icon: Calendar, color: "text-info", path: "/sprints", moduleCode: "PROGRAM" },
  { label: "Program Increments", icon: Package, color: "text-workitem-theme", path: "/pis", moduleCode: "PROGRAM" },
];

export function ItemsDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { isModuleEnabled } = useEnabledModules();

  // Filter items based on enabled modules
  const filteredWorkItems = useMemo(() => 
    workItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const filteredOtherItems = useMemo(() => 
    otherItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const handleItemClick = (path: string) => {
    setOpen(false);
    navigate(path);
  };

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
              Work Items
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