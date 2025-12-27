import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useEnabledModules } from "@/hooks/useModules";
import { useCreateMenuVisibility } from "@/hooks/useCreateMenuVisibility";
import { WorkItemIcon } from "@/components/ja/icons/WorkItemIcon";
import { CatalystCreateTheme } from "@/components/strategic-backlog/CatalystCreateTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getWorkItemsByCategory, WorkItemType } from "@/config/workItemConfig";

// Get items organized by category from centralized config
const enterpriseItems = getWorkItemsByCategory('enterprise').map(item => ({
  label: item.label,
  type: item.key as WorkItemType,
  moduleCode: item.moduleCode,
}));

const productItems = getWorkItemsByCategory('product').map(item => ({
  label: item.label,
  type: item.key as WorkItemType,
  moduleCode: item.moduleCode,
}));

const programItems = getWorkItemsByCategory('program').map(item => ({
  label: item.label,
  type: item.key as WorkItemType,
  moduleCode: item.moduleCode,
}));

const projectItems = getWorkItemsByCategory('project').map(item => ({
  label: item.label,
  type: item.key as WorkItemType,
  moduleCode: item.moduleCode,
}));

const otherItems = getWorkItemsByCategory('other').map(item => ({
  label: item.label,
  type: item.key as WorkItemType,
  moduleCode: item.moduleCode,
}));

export function CreateDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const { isModuleEnabled } = useEnabledModules();
  const { isWorkItemVisible } = useCreateMenuVisibility();

  // Filter items based on enabled modules AND role-based visibility
  const filteredEnterpriseItems = useMemo(() => 
    enterpriseItems.filter(item => 
      (item.moduleCode === null || isModuleEnabled(item.moduleCode)) && 
      isWorkItemVisible(item.type)
    ),
    [isModuleEnabled, isWorkItemVisible]
  );

  const filteredProductItems = useMemo(() => 
    productItems.filter(item => 
      (item.moduleCode === null || isModuleEnabled(item.moduleCode)) && 
      isWorkItemVisible(item.type)
    ),
    [isModuleEnabled, isWorkItemVisible]
  );

  const filteredProgramItems = useMemo(() => 
    programItems.filter(item => 
      (item.moduleCode === null || isModuleEnabled(item.moduleCode)) && 
      isWorkItemVisible(item.type)
    ),
    [isModuleEnabled, isWorkItemVisible]
  );

  const filteredProjectItems = useMemo(() => 
    projectItems.filter(item => 
      (item.moduleCode === null || isModuleEnabled(item.moduleCode)) && 
      isWorkItemVisible(item.type)
    ),
    [isModuleEnabled, isWorkItemVisible]
  );

  const filteredOtherItems = useMemo(() => 
    otherItems.filter(item => 
      (item.moduleCode === null || isModuleEnabled(item.moduleCode)) && 
      isWorkItemVisible(item.type)
    ),
    [isModuleEnabled, isWorkItemVisible]
  );

  const handleItemClick = (type: string) => {
    setOpen(false);
    
    // Handle theme creation - open dialog directly
    if (type === 'theme') {
      setThemeDialogOpen(true);
      return;
    }
    
    // Handle incident creation - route to create page
    if (type === 'incident') {
      navigate('/release/incidents/create');
      return;
    }
    
    // Route to the appropriate page with create parameter
    const routeMap: Record<string, string> = {
      'business-request': '/industry?create=true',
      'epic': '/items/epics?create=true',
      'feature': '/features?create=true',
      'story': '/stories?create=true',
      'defect': '/items/defects?create=true',
      'objective': '/enterprise/okr-hub?create=true',
      'dependency': '/dependencies?create=true',
      'risk': '/enterprise/risks?create=true',
    };

    const route = routeMap[type];
    if (route) {
      navigate(route);
    }
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
            <WorkItemIcon type={item.type} size={20} />
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
          <button
            className="h-8 px-3 flex items-center gap-1 text-sm font-semibold text-white bg-[#2563eb] dark:bg-[#3b82f6] hover:bg-[#1d4ed8] dark:hover:bg-[#2563eb] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] dark:focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 max-h-[600px] overflow-y-auto z-[1000]"
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

      {/* Theme Create Dialog */}
      <CatalystCreateTheme
        open={themeDialogOpen}
        onOpenChange={setThemeDialogOpen}
      />
    </>
  );
}