import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import type { IncidentFormData } from "@/components/incidents/CreateIncidentModal";
import { workItemConfig, getWorkItemsByCategory } from "@/config/workItemConfig";

// Lazy load the heavy modal component
const CreateIncidentModal = lazy(() => import("@/components/incidents/CreateIncidentModal").then(m => ({ default: m.CreateIncidentModal })));

// Get items organized by category from centralized config
const enterpriseItems = getWorkItemsByCategory('enterprise').map(item => ({
  label: item.label,
  icon: item.icon,
  color: item.color,
  type: item.key,
  moduleCode: item.moduleCode,
}));

const productItems = getWorkItemsByCategory('product').map(item => ({
  label: item.label,
  icon: item.icon,
  color: item.color,
  type: item.key,
  moduleCode: item.moduleCode,
}));

const programItems = getWorkItemsByCategory('program').map(item => ({
  label: item.label,
  icon: item.icon,
  color: item.color,
  type: item.key,
  moduleCode: item.moduleCode,
}));

const projectItems = getWorkItemsByCategory('project').map(item => ({
  label: item.label,
  icon: item.icon,
  color: item.color,
  type: item.key,
  moduleCode: item.moduleCode,
}));

const otherItems = getWorkItemsByCategory('other').map(item => ({
  label: item.label,
  icon: item.icon,
  color: item.color,
  type: item.key,
  moduleCode: item.moduleCode,
}));

export function CreateDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const { isModuleEnabled } = useEnabledModules();

  // Filter items based on enabled modules
  const filteredEnterpriseItems = useMemo(() => 
    enterpriseItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const filteredProductItems = useMemo(() => 
    productItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const filteredProgramItems = useMemo(() => 
    programItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const filteredProjectItems = useMemo(() => 
    projectItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
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
      'objective': '/enterprise/okr-hub?create=true',
      'dependency': '/dependencies?create=true',
      'risk': '/enterprise/risks?create=true',
      'incident': '/release/incidents?create=true',
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

  const renderSection = (label: string, items: typeof enterpriseItems) => {
    if (items.length === 0) return null;
    return (
      <>
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
          {label}
        </DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.type}
            onClick={() => handleItemClick(item.type)}
            className="flex items-center gap-3 py-2 cursor-pointer hover:bg-accent"
          >
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <span className="text-sm">{item.label}</span>
          </DropdownMenuItem>
        ))}
      </>
    );
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
          {renderSection('Enterprise', filteredEnterpriseItems)}
          
          {filteredEnterpriseItems.length > 0 && filteredProductItems.length > 0 && (
            <DropdownMenuSeparator className="my-2" />
          )}
          {renderSection('Product', filteredProductItems)}
          
          {filteredProductItems.length > 0 && filteredProgramItems.length > 0 && (
            <DropdownMenuSeparator className="my-2" />
          )}
          {renderSection('Program', filteredProgramItems)}
          
          {filteredProgramItems.length > 0 && filteredProjectItems.length > 0 && (
            <DropdownMenuSeparator className="my-2" />
          )}
          {renderSection('Project', filteredProjectItems)}
          
          {filteredProjectItems.length > 0 && filteredOtherItems.length > 0 && (
            <DropdownMenuSeparator className="my-2" />
          )}
          {renderSection('Other', filteredOtherItems)}
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