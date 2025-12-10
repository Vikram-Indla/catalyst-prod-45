import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Siren } from "lucide-react";
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
import { Circle, Square, Box, FileText, Bug, CheckSquare, Target, GitBranch, Lightbulb, AlertTriangle, AlertCircle, FileCheck, Calendar, Package, Flag, Briefcase } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { IncidentFormData } from "@/components/incidents/CreateIncidentModal";

// Lazy load the heavy modal component
const CreateIncidentModal = lazy(() => import("@/components/incidents/CreateIncidentModal").then(m => ({ default: m.CreateIncidentModal })));

// Module mapping for each item - null means always visible
const workItems = [
  { label: "Themes", icon: Circle, color: "text-workitem-theme", type: "theme", moduleCode: "PORTFOLIO" },
  { label: "Business Request", icon: Briefcase, color: "text-brand-gold", type: "business-request", moduleCode: "PRODUCT" },
  { label: "Epics", icon: Square, color: "text-workitem-epic", type: "epic", moduleCode: "PORTFOLIO" },
  { label: "Features", icon: Box, color: "text-workitem-feature", type: "feature", moduleCode: "PROGRAM" },
  { label: "Stories", icon: FileText, color: "text-workitem-story", type: "story", moduleCode: "TEAMS" },
  { label: "Defects", icon: Bug, color: "text-workitem-defect", type: "defect", moduleCode: "TEAMS" },
  { label: "Tasks", icon: CheckSquare, color: "text-workitem-subtask", type: "task", moduleCode: "TEAMS" },
];

const otherItems = [
  { label: "Objectives", icon: Target, color: "text-brand-gold", type: "objective", moduleCode: "ENTERPRISE" },
  { label: "Dependencies", icon: GitBranch, color: "text-warning", type: "dependency", moduleCode: "PROGRAM" },
  { label: "Ideation", icon: Lightbulb, color: "text-warning-600", type: "ideation", moduleCode: "PRODUCT" },
  { label: "Risks", icon: AlertTriangle, color: "text-destructive", type: "risk", moduleCode: "ENTERPRISE" },
  { label: "Impediments", icon: AlertCircle, color: "text-warning", type: "impediment", moduleCode: "TEAMS" },
  { label: "Specifications", icon: FileCheck, color: "text-success", type: "specification", moduleCode: null },
  { label: "Sprints", icon: Calendar, color: "text-info", type: "sprint", moduleCode: "PROGRAM" },
  { label: "Program Increments", icon: Package, color: "text-workitem-theme", type: "pi", moduleCode: "PROGRAM" },
  { label: "Release Vehicles", icon: Flag, color: "text-success-600", type: "release-vehicle", moduleCode: "PROGRAM" },
  { label: "Incidents", icon: Siren, color: "text-red-600", type: "incident", moduleCode: null },
];

export function CreateDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
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

  const handleItemClick = (type: string) => {
    setOpen(false);
    
    // Handle incident creation via modal
    if (type === 'incident') {
      setIncidentModalOpen(true);
      return;
    }
    
    // Route to the appropriate page with create parameter
    const routeMap: Record<string, string> = {
      'theme': '/themes?create=true',
      'business-request': '/industry?create=true',
      'epic': '/items/epics?create=true',
      'feature': '/features?create=true',
      'story': '/stories?create=true',
      'defect': '/items/defects?create=true',
      'task': '/items/tasks?create=true',
      'objective': '/enterprise/okr-hub?create=true',
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

  const handleCreateIncident = (data: IncidentFormData) => {
    // Generate incident number
    const incidentNumber = `INC-${1000 + Math.floor(Math.random() * 1000)}`;
    
    console.log('Creating incident:', { incidentNumber, ...data });
    
    toast({
      title: "Incident Created",
      description: `Incident ${incidentNumber} created successfully!`,
    });
    
    // Optionally navigate to incidents list
    navigate('/release/incidents');
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="h-8 px-2.5 bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
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
                  onClick={() => handleItemClick(item.type)}
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
                  onClick={() => handleItemClick(item.type)}
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

      {incidentModalOpen && (
        <Suspense fallback={null}>
          <CreateIncidentModal
            isOpen={incidentModalOpen}
            onClose={() => setIncidentModalOpen(false)}
            onSubmit={handleCreateIncident}
          />
        </Suspense>
      )}
    </>
  );
}