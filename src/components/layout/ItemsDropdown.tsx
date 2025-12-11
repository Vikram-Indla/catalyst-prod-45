import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnabledModules } from '@/hooks/useModules';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Circle,
  Building2,
  Square,
  Gem,
  FileText,
  Target,
  GitBranch,
  AlertTriangle,
  Calendar,
  Package,
  Siren,
  FolderKanban,
} from 'lucide-react';

interface ItemsDropdownProps {
  trigger?: React.ReactNode;
  onClose?: () => void;
}

// Work Items section - core deliverables
const workItems = [
  { key: 'themes', label: 'Themes', icon: Circle, color: 'text-workitem-theme', path: '/portfolio/:portfolioId/backlog?type=theme', moduleCode: 'PORTFOLIO' },
  { key: 'business-requests', label: 'Business Request', icon: Building2, color: 'text-brand-gold', path: '/demand/list', moduleCode: 'PRODUCT' },
  { key: 'epics', label: 'Epics', icon: Square, color: 'text-workitem-epic', path: '/portfolio/:portfolioId/backlog?type=epic', moduleCode: 'PORTFOLIO' },
  { key: 'features', label: 'Features', icon: Gem, color: 'text-workitem-feature', path: '/programs/:programId/backlog?type=feature', moduleCode: 'PROGRAM' },
  { key: 'stories', label: 'Stories', icon: FileText, color: 'text-workitem-story', path: '/teams/:teamId/backlog?type=story', moduleCode: 'TEAMS' },
];

// Planning section - programs, projects
const planningItems = [
  { key: 'programs', label: 'Programs', icon: FolderKanban, color: 'text-workitem-feature', path: '/programs', moduleCode: 'PROGRAM' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, color: 'text-info', path: '/projects', moduleCode: 'PROGRAM' },
];

// Other section - supporting items
const otherItems = [
  { key: 'objectives', label: 'Objectives', icon: Target, color: 'text-brand-gold', path: '/portfolio/:portfolioId/objectives', moduleCode: 'ENTERPRISE' },
  { key: 'dependencies', label: 'Dependencies', icon: GitBranch, color: 'text-brand-gold', path: '/programs/:programId/dependencies', moduleCode: 'PROGRAM' },
  { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'text-destructive', path: '/programs/:programId/risks', moduleCode: 'ENTERPRISE' },
  { key: 'sprints', label: 'Sprints', icon: Calendar, color: 'text-brand-gold', path: '/teams/:teamId/sprints', moduleCode: 'PROGRAM' },
  { key: 'program-increments', label: 'Program Increments', icon: Package, color: 'text-workitem-theme', path: '/programs/:programId/increments', moduleCode: 'PROGRAM' },
  { key: 'incidents', label: 'Incidents', icon: Siren, color: 'text-destructive', path: '/release/incidents', moduleCode: null },
];

export function ItemsDropdown({ trigger, onClose }: ItemsDropdownProps) {
  const navigate = useNavigate();
  const { isModuleEnabled } = useEnabledModules();

  // Filter items based on enabled modules
  const filteredWorkItems = useMemo(() => 
    workItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const filteredPlanningItems = useMemo(() => 
    planningItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const filteredOtherItems = useMemo(() => 
    otherItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const handleClick = (itemPath: string) => {
    navigate(itemPath);
    onClose?.();
  };

  // Don't render dropdown if no items are available
  const hasItems = filteredWorkItems.length > 0 || filteredPlanningItems.length > 0 || filteredOtherItems.length > 0;
  if (!hasItems) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            Items
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-[600px] overflow-y-auto" align="start">
        {filteredWorkItems.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
              WORK ITEMS
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {filteredWorkItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => handleClick(item.path)}
                    className="cursor-pointer"
                  >
                    <Icon className={`mr-2 h-4 w-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </>
        )}
        
        {filteredWorkItems.length > 0 && filteredPlanningItems.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {filteredPlanningItems.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
              PLANNING
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {filteredPlanningItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => handleClick(item.path)}
                    className="cursor-pointer"
                  >
                    <Icon className={`mr-2 h-4 w-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </>
        )}
        
        {(filteredWorkItems.length > 0 || filteredPlanningItems.length > 0) && filteredOtherItems.length > 0 && (
          <DropdownMenuSeparator />
        )}
        
        {filteredOtherItems.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
              OTHER
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {filteredOtherItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => handleClick(item.path)}
                    className="cursor-pointer"
                  >
                    <Icon className={`mr-2 h-4 w-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}