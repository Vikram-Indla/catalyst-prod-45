import { useNavigate } from 'react-router-dom';
import { 
  Layers, Diamond, Box, Zap, BookOpen, AlertCircle, CheckSquare,
  Target, GitBranch, Lightbulb, AlertTriangle, Shield, Calendar, Package, List, Clock, Truck
} from 'lucide-react';

const workItems = [
  { label: 'Themes', icon: Layers, color: 'bg-emerald-500' },
  { label: 'Epics', icon: Diamond, color: 'bg-blue-500' },
  { label: 'Capabilities', icon: Box, color: 'bg-amber-500' },
  { label: 'Features', icon: Zap, color: 'bg-purple-600' },
  { label: 'Stories', icon: BookOpen, color: 'bg-teal-500' },
  { label: 'Defects', icon: AlertCircle, color: 'bg-red-500' },
  { label: 'Tasks', icon: CheckSquare, color: 'bg-blue-400' }
];

const otherItems = [
  { label: 'Objectives', icon: Target, color: 'bg-slate-600' },
  { label: 'Dependencies', icon: GitBranch, color: 'bg-slate-600' },
  { label: 'Ideation', icon: Lightbulb, color: 'bg-slate-600' },
  { label: 'Risks', icon: AlertTriangle, color: 'bg-slate-600' },
  { label: 'Impediments', icon: Shield, color: 'bg-slate-600' },
  { label: 'Specifications', icon: List, color: 'bg-slate-600' },
  { label: 'Sprints', icon: Clock, color: 'bg-slate-600' },
  { label: 'Program Increments', icon: Calendar, color: 'bg-slate-600' },
  { label: 'Release Vehicles', icon: Truck, color: 'bg-slate-600' }
];

interface CreateDropdownProps {
  onClose: () => void;
  onCreateEpic?: () => void;
}

export function CreateDropdown({ onClose, onCreateEpic }: CreateDropdownProps) {
  const navigate = useNavigate();

  const handleClick = (label: string) => {
    console.log('Create:', label);
    
    // Handle Epic creation specially if handler provided
    if (label === 'Epics' && onCreateEpic) {
      onCreateEpic();
      onClose();
      return;
    }
    
    // Navigate to the respective page for other items
    const routeMap: Record<string, string> = {
      'Themes': '/items/themes',
      'Epics': '/items/epics?create=true',
      'Capabilities': '/items/capabilities',
      'Features': '/items/features',
      'Stories': '/items/stories',
      'Defects': '/items/defects',
      'Tasks': '/items/tasks',
      'Objectives': '/items/objectives',
      'Dependencies': '/items/dependencies',
      'Ideation': '/items/ideation',
      'Risks': '/items/risks',
      'Impediments': '/items/impediments',
      'Specifications': '/items/specifications',
      'Sprints': '/items/sprints',
      'Program Increments': '/items/program-increments',
      'Release Vehicles': '/items/release-vehicles',
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
