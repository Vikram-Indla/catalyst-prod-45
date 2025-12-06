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
  Diamond, 
  Layers3, 
  Target,
  GitBranch,
  FileText,
  Bug,
  CheckSquare,
  Lightbulb,
  AlertTriangle,
  Link2,
  Calendar,
  Package,
  Rocket,
  Users,
  Star
} from 'lucide-react';

interface ItemsDropdownProps {
  trigger?: React.ReactNode;
  onClose?: () => void;
}

// Module mapping for each item - null means always visible
const workItems = [
  { key: 'themes', label: 'Themes', icon: Star, color: 'text-workitem-theme', path: '/portfolio/:portfolioId/backlog?type=theme', moduleCode: 'PORTFOLIO' },
  { key: 'epics', label: 'Epics', icon: Diamond, color: 'text-workitem-epic', path: '/portfolio/:portfolioId/backlog?type=epic', moduleCode: 'PORTFOLIO' },
  { key: 'features', label: 'Features', icon: Layers3, color: 'text-workitem-story', path: '/programs/:programId/backlog?type=feature', moduleCode: 'PROGRAM' },
  { key: 'stories', label: 'Stories', icon: FileText, color: 'text-warning', path: '/teams/:teamId/backlog?type=story', moduleCode: 'TEAMS' },
  { key: 'defects', label: 'Defects', icon: Bug, color: 'text-destructive', path: '/teams/:teamId/backlog?type=defect', moduleCode: 'TEAMS' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: 'text-muted-foreground', path: '/teams/:teamId/backlog?type=task', moduleCode: 'TEAMS' },
];

const otherItems = [
  { key: 'objectives', label: 'Objectives', icon: Target, color: 'text-workitem-theme', path: '/portfolio/:portfolioId/objectives', moduleCode: 'ENTERPRISE' },
  { key: 'dependencies', label: 'Dependencies', icon: Link2, color: 'text-accent-foreground', path: '/programs/:programId/dependencies', moduleCode: 'PROGRAM' },
  { key: 'ideation', label: 'Ideation', icon: Lightbulb, color: 'text-warning', path: '/portfolio/:portfolioId/ideation', moduleCode: 'PRODUCT' },
  { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'text-destructive', path: '/programs/:programId/risks', moduleCode: 'ENTERPRISE' },
  { key: 'impediments', label: 'Impediments', icon: AlertTriangle, color: 'text-warning', path: '/teams/:teamId/impediments', moduleCode: 'TEAMS' },
  { key: 'sprints', label: 'Sprints', icon: Calendar, color: 'text-info', path: '/teams/:teamId/sprints', moduleCode: 'PROGRAM' },
  { key: 'program-increments', label: 'Program Increments', icon: Calendar, color: 'text-workitem-theme', path: '/programs/:programId/increments', moduleCode: 'PROGRAM' },
  { key: 'release-vehicles', label: 'Release Vehicles', icon: Rocket, color: 'text-success', path: '/programs/:programId/releases', moduleCode: 'PROGRAM' },
  { key: 'teams', label: 'Teams', icon: Users, color: 'text-success', path: '/teams', moduleCode: 'TEAMS' },
];

export function ItemsDropdown({ trigger, onClose }: ItemsDropdownProps) {
  const navigate = useNavigate();
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

  const handleClick = (itemPath: string) => {
    navigate(itemPath);
    onClose?.();
  };

  // Don't render dropdown if no items are available
  if (filteredWorkItems.length === 0 && filteredOtherItems.length === 0) {
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
        
        {filteredWorkItems.length > 0 && filteredOtherItems.length > 0 && (
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