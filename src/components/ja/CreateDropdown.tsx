import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Circle, Square, Hexagon, Box, FileText, Bug, CheckSquare, Target, GitBranch, Lightbulb, AlertTriangle, AlertCircle, FileCheck, Calendar, Package, Flag, Briefcase } from "lucide-react";

const workItems = [
  { label: "Themes", icon: Circle, color: "text-workitem-theme", type: "theme" },
  { label: "Business Request", icon: Briefcase, color: "text-brand-gold", type: "business-request" },
  { label: "Epics", icon: Square, color: "text-workitem-epic", type: "epic" },
  { label: "Features", icon: Box, color: "text-workitem-feature", type: "feature" },
  { label: "Stories", icon: FileText, color: "text-workitem-story", type: "story" },
  { label: "Defects", icon: Bug, color: "text-workitem-defect", type: "defect" },
  { label: "Tasks", icon: CheckSquare, color: "text-workitem-subtask", type: "task" },
];

const otherItems = [
  { label: "Objectives", icon: Target, color: "text-brand-gold", type: "objective" },
  { label: "Dependencies", icon: GitBranch, color: "text-warning", type: "dependency" },
  { label: "Ideation", icon: Lightbulb, color: "text-warning-600", type: "ideation" },
  { label: "Risks", icon: AlertTriangle, color: "text-destructive", type: "risk" },
  { label: "Impediments", icon: AlertCircle, color: "text-warning", type: "impediment" },
  { label: "Specifications", icon: FileCheck, color: "text-success", type: "specification" },
  { label: "Sprints", icon: Calendar, color: "text-info", type: "sprint" },
  { label: "Program Increments", icon: Package, color: "text-workitem-theme", type: "pi" },
  { label: "Release Vehicles", icon: Flag, color: "text-success-600", type: "release-vehicle" },
];

export function CreateDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleItemClick = (type: string) => {
    setOpen(false);
    
    // Route to the appropriate page with create parameter
    const routeMap: Record<string, string> = {
      'theme': '/themes?create=true',
      'business-request': '/industry?create=true',
      'epic': '/items/epics?create=true',
      'feature': '/features?create=true',
      'story': '/stories?create=true',
      'defect': '/items/defects?create=true',
      'task': '/items/tasks?create=true',
      'objective': '/enterprise/objectives?create=true',
      'dependency': '/dependencies?create=true',
      'ideation': '/items/ideation?create=true',
      'risk': '/enterprise/risks?create=true',
      'impediment': '/items/impediments?create=true',
      'specification': '/items/success-criteria?create=true',
      'sprint': '/sprints?create=true',
      'pi': '/pis?create=true',
      'release-vehicle': '/items/release-vehicles?create=true',
    };

    const route = routeMap[type];
    if (route) {
      navigate(route);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="h-8 px-3 sm:h-9 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 max-h-[600px] overflow-y-auto bg-popover z-50"
      >
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
          Work Items
        </DropdownMenuLabel>
        {workItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => handleItemClick(item.type)}
            className="flex items-center gap-3 py-2 cursor-pointer hover:bg-accent"
          >
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <span className="text-sm">{item.label}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
          Other
        </DropdownMenuLabel>
        {otherItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => handleItemClick(item.type)}
            className="flex items-center gap-3 py-2 cursor-pointer hover:bg-accent"
          >
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <span className="text-sm">{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
