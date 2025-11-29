import { useNavigate } from 'react-router-dom';
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

const workItems = [
  { key: 'themes', label: 'Themes', icon: Star, color: 'text-purple-600', path: '/portfolio/:portfolioId/backlog?type=theme' },
  { key: 'epics', label: 'Epics', icon: Diamond, color: 'text-blue-600', path: '/portfolio/:portfolioId/backlog?type=epic' },
  { key: 'capabilities', label: 'Capabilities', icon: Package, color: 'text-teal-600', path: '/portfolio/:portfolioId/backlog?type=capability' },
  { key: 'features', label: 'Features', icon: Layers3, color: 'text-green-600', path: '/programs/:programId/backlog?type=feature' },
  { key: 'stories', label: 'Stories', icon: FileText, color: 'text-orange-600', path: '/teams/:teamId/backlog?type=story' },
  { key: 'defects', label: 'Defects', icon: Bug, color: 'text-red-600', path: '/teams/:teamId/backlog?type=defect' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: 'text-gray-600', path: '/teams/:teamId/backlog?type=task' },
];

const otherItems = [
  { key: 'objectives', label: 'Objectives', icon: Target, color: 'text-indigo-600', path: '/portfolio/:portfolioId/objectives' },
  { key: 'dependencies', label: 'Dependencies', icon: Link2, color: 'text-pink-600', path: '/programs/:programId/dependencies' },
  { key: 'ideation', label: 'Ideation', icon: Lightbulb, color: 'text-yellow-600', path: '/portfolio/:portfolioId/ideation' },
  { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'text-red-600', path: '/programs/:programId/risks' },
  { key: 'impediments', label: 'Impediments', icon: AlertTriangle, color: 'text-orange-600', path: '/teams/:teamId/impediments' },
  { key: 'sprints', label: 'Sprints', icon: Calendar, color: 'text-blue-600', path: '/teams/:teamId/sprints' },
  { key: 'program-increments', label: 'Program Increments', icon: Calendar, color: 'text-purple-600', path: '/programs/:programId/increments' },
  { key: 'release-vehicles', label: 'Release Vehicles', icon: Rocket, color: 'text-green-600', path: '/programs/:programId/releases' },
  { key: 'teams', label: 'Teams', icon: Users, color: 'text-teal-600', path: '/teams' },
];

export function ItemsDropdown({ trigger, onClose }: ItemsDropdownProps) {
  const navigate = useNavigate();

  const handleClick = (itemPath: string) => {
    // For now, navigate to the path as-is
    // In a real implementation, we'd resolve the context IDs
    navigate(itemPath);
    onClose?.();
  };

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
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
          WORK ITEMS
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {workItems.map((item) => {
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
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">
          OTHER
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {otherItems.map((item) => {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
