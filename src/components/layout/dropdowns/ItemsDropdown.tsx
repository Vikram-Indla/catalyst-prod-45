import { useNavigate } from 'react-router-dom';
import { 
  Layers, Diamond, Box, Zap, BookOpen, AlertCircle, CheckSquare,
  Target, GitBranch, Lightbulb, AlertTriangle, Shield, Calendar, Package, Award
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const workItems = [
  { label: 'Themes', icon: Layers, path: '/items/themes', color: 'bg-emerald-500' },
  { label: 'Epics', icon: Diamond, path: '/items/epics', color: 'bg-blue-500' },
  { label: 'Capabilities', icon: Box, path: '/items/capabilities', color: 'bg-amber-500' },
  { label: 'Features', icon: Zap, path: '/items/features', color: 'bg-purple-600' },
  { label: 'Stories', icon: BookOpen, path: '/items/stories', color: 'bg-teal-500' },
  { label: 'Defects', icon: AlertCircle, path: '/items/defects', color: 'bg-red-500' },
  { label: 'Tasks', icon: CheckSquare, path: '/items/tasks', color: 'bg-blue-400' }
];

const otherItems = [
  { label: 'Objectives', icon: Target, path: '/items/objectives' },
  { label: 'Dependencies', icon: GitBranch, path: '/items/dependencies' },
  { label: 'Ideation', icon: Lightbulb, path: '/items/ideation' },
  { label: 'Risks', icon: AlertTriangle, path: '/items/risks' },
  { label: 'Impediments', icon: Shield, path: '/items/impediments' },
  { label: 'Sprints', icon: Calendar, path: '/items/sprints' },
  { label: 'Program Increments', icon: Package, path: '/items/program-increments' },
  { label: 'Release Vehicles (Fix Versions)', icon: Package, path: '/items/release-vehicles' },
  { label: 'Success Criteria', icon: Award, path: '/items/success-criteria' }
];

interface ItemsDropdownProps {
  onClose: () => void;
}

export function ItemsDropdown({ onClose }: ItemsDropdownProps) {
  const navigate = useNavigate();

  const handleClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-lg z-50">
      <ScrollArea className="max-h-96">
        <div className="p-2">
          <p className="text-xs font-semibold text-muted-foreground px-3 py-2">WORK ITEMS</p>
          {workItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleClick(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent text-left"
            >
              <div className={`w-6 h-6 rounded ${item.color} flex items-center justify-center`}>
                <item.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}

          <p className="text-xs font-semibold text-muted-foreground px-3 py-2 mt-2">OTHER</p>
          {otherItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleClick(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent text-left"
            >
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
