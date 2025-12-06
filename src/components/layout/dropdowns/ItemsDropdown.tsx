import { useMemo } from 'react';
import { 
  Layers, Diamond, Box, Zap, BookOpen, AlertCircle, CheckSquare,
  Target, GitBranch, Lightbulb, AlertTriangle, Shield, Calendar, Package, Award, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEnabledModules } from '@/hooks/useModules';

// Module mapping for each item - null means always visible
const workItems = [
  { key: 'themes', label: 'Themes', icon: Layers, color: 'bg-workitem-theme', moduleCode: 'PORTFOLIO' },
  { key: 'epics', label: 'Epics', icon: Diamond, color: 'bg-workitem-epic', moduleCode: 'PORTFOLIO' },
  { key: 'epic-backlog', label: 'Backlog → Epics', icon: Diamond, color: 'bg-workitem-theme', moduleCode: 'PORTFOLIO' },
  { key: 'features', label: 'Features', icon: Zap, color: 'bg-workitem-feature', moduleCode: 'PROGRAM' },
  { key: 'stories', label: 'Stories', icon: BookOpen, color: 'bg-success', moduleCode: 'TEAMS' },
  { key: 'defects', label: 'Defects', icon: AlertCircle, color: 'bg-destructive', moduleCode: 'TEAMS' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: 'bg-info', moduleCode: 'TEAMS' }
];

const otherItems = [
  { key: 'objectives', label: 'Objectives', icon: Target, color: 'bg-secondary', moduleCode: 'ENTERPRISE' },
  { key: 'dependencies', label: 'Dependencies', icon: GitBranch, color: 'bg-secondary', moduleCode: 'PROGRAM' },
  { key: 'teams', label: 'Teams', icon: Users, color: 'bg-workitem-feature', moduleCode: 'TEAMS' },
  { key: 'ideation', label: 'Ideation', icon: Lightbulb, color: 'bg-secondary', moduleCode: 'PRODUCT' },
  { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'bg-secondary', moduleCode: 'ENTERPRISE' },
  { key: 'impediments', label: 'Impediments', icon: Shield, color: 'bg-secondary', moduleCode: 'TEAMS' },
  { key: 'sprints', label: 'Sprints', icon: Calendar, color: 'bg-secondary', moduleCode: 'PROGRAM' },
  { key: 'program-increments', label: 'Program Increments', icon: Package, color: 'bg-secondary', moduleCode: 'PROGRAM' },
  { key: 'release-vehicles', label: 'Release Vehicles (Fix Versions)', icon: Package, color: 'bg-secondary', moduleCode: 'PROGRAM' },
  { key: 'success-criteria', label: 'Success Criteria', icon: Award, color: 'bg-secondary', moduleCode: null }
];

interface ItemsDropdownProps {
  onClose: () => void;
}

export function ItemsDropdown({ onClose }: ItemsDropdownProps) {
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
  
  const handleClick = (itemKey: string) => {
    const routeMap: Record<string, string> = {
      'themes': '/themes',
      'epics': '/items/epics',
      'epic-backlog': '/items/epics',
      'features': '/features',
      'stories': '/work-items/stories',
      'defects': '/items/defects',
      'tasks': '/items/tasks',
      'objectives': '/pi-objectives',
      'dependencies': '/dependencies',
      'teams': '/teams',
      'ideation': '/items/ideation',
      'risks': '/roam',
      'impediments': '/items/impediments',
      'sprints': '/sprints',
      'program-increments': '/pis',
      'release-vehicles': '/items/release-vehicles',
      'success-criteria': '/items/success-criteria',
    };
    
    const route = routeMap[itemKey];
    if (route) {
      navigate(route);
    }
    onClose();
  };

  // Don't render if no items are available
  if (filteredWorkItems.length === 0 && filteredOtherItems.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-xl z-[100] max-h-[calc(100vh-5rem)] overflow-y-auto"
      role="menu"
      aria-label="Work items menu"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3">
        {filteredWorkItems.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">WORK ITEMS</p>
            {filteredWorkItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleClick(item.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent text-left transition-colors focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                role="menuitem"
                tabIndex={0}
              >
                <div className={`w-8 h-8 rounded-md ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </>
        )}

        {filteredWorkItems.length > 0 && filteredOtherItems.length > 0 && (
          <div className="my-3 border-t border-border" />
        )}

        {filteredOtherItems.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">OTHER</p>
            {filteredOtherItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleClick(item.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent text-left transition-colors focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                role="menuitem"
                tabIndex={0}
              >
                <div className={`w-8 h-8 rounded-md ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}