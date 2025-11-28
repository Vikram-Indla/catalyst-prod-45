import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Circle, Square, Hexagon, Box, FileText, Bug, CheckSquare, Target, GitBranch, Lightbulb, AlertTriangle, AlertCircle, FileCheck, Calendar, Package, Flag } from "lucide-react";

const workItems = [
  { label: "Themes", icon: Circle, color: "text-purple-500", path: "/themes" },
  { label: "Epics", icon: Square, color: "text-blue-500", path: "/backlog/epics" },
  { label: "Capabilities", icon: Hexagon, color: "text-cyan-500", path: "/items/capabilities" },
  { label: "Features", icon: Box, color: "text-indigo-500", path: "/features" },
  { label: "Stories", icon: FileText, color: "text-green-500", path: "/work-items/stories" },
  { label: "Defects", icon: Bug, color: "text-red-500", path: "/items/defects" },
  { label: "Tasks", icon: CheckSquare, color: "text-gray-500", path: "/items/tasks" },
];

const otherItems = [
  { label: "Objectives", icon: Target, color: "text-blue-600", path: "/enterprise/objectives" },
  { label: "Dependencies", icon: GitBranch, color: "text-orange-500", path: "/dependencies" },
  { label: "Ideation", icon: Lightbulb, color: "text-yellow-500", path: "/items/ideation" },
  { label: "Risks", icon: AlertTriangle, color: "text-red-600", path: "/enterprise/risks" },
  { label: "Impediments", icon: AlertCircle, color: "text-orange-600", path: "/items/impediments" },
  { label: "Specifications", icon: FileCheck, color: "text-teal-500", path: "/items/success-criteria" },
  { label: "Sprints", icon: Calendar, color: "text-blue-400", path: "/sprints" },
  { label: "Program Increments", icon: Package, color: "text-purple-600", path: "/pis" },
  { label: "Release Vehicles (Fix Versions)", icon: Flag, color: "text-green-600", path: "/items/release-vehicles" },
];

export function ItemsDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleItemClick = (path: string) => {
    setOpen(false);
    navigate(path);
  };

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
          Work Items
        </DropdownMenuLabel>
        {workItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => handleItemClick(item.path)}
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
            onClick={() => handleItemClick(item.path)}
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
