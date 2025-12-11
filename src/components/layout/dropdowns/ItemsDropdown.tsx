import { useMemo } from 'react';
import { 
  Circle, Building2, Square, Gem, FileText, AlertCircle, CheckSquare,
  Target, GitBranch, AlertTriangle, Shield, Calendar, Package, Siren, FolderKanban
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEnabledModules } from '@/hooks/useModules';

// Work Items section - core deliverables
const workItems = [
  { key: 'themes', label: 'Themes', icon: Circle, color: 'bg-workitem-theme', moduleCode: 'PORTFOLIO' },
  { key: 'business-requests', label: 'Business Request', icon: Building2, color: 'bg-brand-gold', moduleCode: 'PRODUCT' },
  { key: 'epics', label: 'Epics', icon: Square, color: 'bg-workitem-epic', moduleCode: 'PORTFOLIO' },
  { key: 'features', label: 'Features', icon: Gem, color: 'bg-workitem-feature', moduleCode: 'PROGRAM' },
  { key: 'stories', label: 'Stories', icon: FileText, color: 'bg-workitem-story', moduleCode: 'TEAMS' },
];

// Planning section - programs, projects, etc.
const planningItems = [
  { key: 'programs', label: 'Programs', icon: FolderKanban, color: 'bg-workitem-feature', moduleCode: 'PROGRAM' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, color: 'bg-info', moduleCode: 'PROGRAM' },
];

// Other section - supporting items
const otherItems = [
  { key: 'objectives', label: 'Objectives', icon: Target, color: 'bg-brand-gold', moduleCode: 'ENTERPRISE' },
  { key: 'dependencies', label: 'Dependencies', icon: GitBranch, color: 'bg-brand-gold', moduleCode: 'PROGRAM' },
  { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'bg-destructive', moduleCode: 'ENTERPRISE' },
  { key: 'sprints', label: 'Sprints', icon: Calendar, color: 'bg-brand-gold', moduleCode: 'PROGRAM' },
  { key: 'program-increments', label: 'Program Increments', icon: Package, color: 'bg-workitem-theme', moduleCode: 'PROGRAM' },
  { key: 'incidents', label: 'Incidents', icon: Siren, color: 'bg-destructive', moduleCode: null },
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

  const filteredPlanningItems = useMemo(() => 
    planningItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const filteredOtherItems = useMemo(() => 
    otherItems.filter(item => item.moduleCode === null || isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );
  
  const handleClick = (itemKey: string) => {
    const routeMap: Record<string, string> = {
      'themes': '/themes',
      'business-requests': '/demand/list',
      'epics': '/items/epics',
      'features': '/features',
      'stories': '/work-items/stories',
      'programs': '/programs',
      'projects': '/projects',
      'objectives': '/pi-objectives',
      'dependencies': '/dependencies',
      'risks': '/roam',
      'sprints': '/sprints',
      'program-increments': '/pis',
      'incidents': '/release/incidents',
    };
    
    const route = routeMap[itemKey];
    if (route) {
      navigate(route);
    }
    onClose();
  };

  // Don't render if no items are available
  const hasItems = filteredWorkItems.length > 0 || filteredPlanningItems.length > 0 || filteredOtherItems.length > 0;
  if (!hasItems) {
    return null;
  }

  const renderSection = (items: typeof workItems, title: string) => (
    <>
      <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">{title}</p>
      {items.map((item) => (
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
  );

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-xl z-[100] max-h-[calc(100vh-5rem)] overflow-y-auto"
      role="menu"
      aria-label="Work items menu"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3">
        {filteredWorkItems.length > 0 && renderSection(filteredWorkItems, 'WORK ITEMS')}

        {filteredWorkItems.length > 0 && filteredPlanningItems.length > 0 && (
          <div className="my-3 border-t border-border" />
        )}

        {filteredPlanningItems.length > 0 && renderSection(filteredPlanningItems, 'PLANNING')}

        {(filteredWorkItems.length > 0 || filteredPlanningItems.length > 0) && filteredOtherItems.length > 0 && (
          <div className="my-3 border-t border-border" />
        )}

        {filteredOtherItems.length > 0 && renderSection(filteredOtherItems, 'OTHER')}
      </div>
    </div>
  );
}