import { useNavigate } from 'react-router-dom';
import { 
  Layers, Diamond, Box, Zap, BookOpen, AlertCircle, CheckSquare,
  Target, GitBranch, Lightbulb, AlertTriangle, Shield, Calendar, Package, List, Clock, Truck, Users, Siren
} from 'lucide-react';

const workItems = [
  { label: 'Business Request', icon: Layers, color: 'bg-workitem-theme' },
  { label: 'Features', icon: Zap, color: 'bg-workitem-theme' },
  { label: 'Stories', icon: BookOpen, color: 'bg-success' },
  { label: 'Defects', icon: AlertCircle, color: 'bg-destructive' },
  { label: 'Tasks', icon: CheckSquare, color: 'bg-info' }
];

const otherItems = [
  { label: 'Objectives', icon: Target, color: 'bg-secondary' },
  { label: 'Dependencies', icon: GitBranch, color: 'bg-secondary' },
  { label: 'Ideation', icon: Lightbulb, color: 'bg-secondary' },
  { label: 'Risks', icon: AlertTriangle, color: 'bg-secondary' },
  { label: 'Impediments', icon: Shield, color: 'bg-secondary' },
  { label: 'Specifications', icon: List, color: 'bg-secondary' },
  { label: 'Sprints', icon: Clock, color: 'bg-secondary' },
  { label: 'Program Increments', icon: Calendar, color: 'bg-secondary' },
  { label: 'Release Vehicles', icon: Truck, color: 'bg-secondary' },
  { label: 'Incidents', icon: Siren, color: 'bg-red-600' }
];

interface CreateDropdownProps {
  onClose: () => void;
  onCreateEpic?: () => void;
  onCreateIncident?: () => void;
}

export function CreateDropdown({ onClose, onCreateEpic, onCreateIncident }: CreateDropdownProps) {
  const navigate = useNavigate();

  const handleClick = (label: string) => {
    console.log('Create:', label);
    
    // Handle Epic creation specially if handler provided
    if (label === 'Epics' && onCreateEpic) {
      onCreateEpic();
      onClose();
      return;
    }

    // Handle Incident creation specially if handler provided
    if (label === 'Incidents' && onCreateIncident) {
      onCreateIncident();
      onClose();
      return;
    }
    
    // Navigate to the respective page for other items
    const routeMap: Record<string, string> = {
      'Business Request': '/industry?create=true',
      'Themes': '/items/themes',
      'Epics': '/items/epics?create=true',
      'Features': '/features?create=true',
      'Stories': '/items/stories',
      'Defects': '/items/defects',
      'Tasks': '/items/tasks',
      'Objectives': '/items/objectives',
      'Dependencies': '/items/dependencies',
      'Teams': '/teams',
      'Ideation': '/items/ideation',
      'Risks': '/items/risks',
      'Impediments': '/items/impediments',
      'Specifications': '/items/specifications',
      'Sprints': '/items/sprints',
      'Program Increments': '/items/program-increments',
      'Release Vehicles': '/items/release-vehicles',
      'Incidents': '/release/incidents',
    };
    
    if (routeMap[label]) {
      navigate(routeMap[label]);
    }
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-1 w-64 bg-popover border rounded-md shadow-lg z-50">
      <div className="max-h-[500px] overflow-y-auto">
        <div className="p-2">
          <p className="text-xs font-semibold text-muted-foreground px-3 py-2">WORK ITEMS</p>
          {workItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleClick(item.label)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent text-left"
            >
              <div className={`w-7 h-7 rounded-md ${item.color} flex items-center justify-center shrink-0`}>
                <item.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}

          <p className="text-xs font-semibold text-muted-foreground px-3 py-2 mt-2">OTHER</p>
          {otherItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleClick(item.label)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent text-left"
            >
              <div className={`w-7 h-7 rounded-md ${item.color} flex items-center justify-center shrink-0`}>
                <item.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
