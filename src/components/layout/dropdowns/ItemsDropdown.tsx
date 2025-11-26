import { useNavigate } from 'react-router-dom';
import { 
  Layers, Diamond, Box, Zap, BookOpen, AlertCircle, CheckSquare,
  Target, GitBranch, Lightbulb, AlertTriangle, Shield, Calendar, Package, Award
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const workItems = [
  { key: 'themes', label: 'Themes', icon: Layers, path: '/items/themes', color: 'bg-emerald-500' },
  { key: 'epics', label: 'Epics', icon: Diamond, path: '/items/epics', color: 'bg-blue-500' },
  { key: 'capabilities', label: 'Capabilities', icon: Box, path: '/items/capabilities', color: 'bg-amber-500' },
  { key: 'features', label: 'Features', icon: Zap, path: '/items/features', color: 'bg-purple-500' },
  { key: 'stories', label: 'Stories', icon: BookOpen, path: '/items/stories', color: 'bg-teal-500' },
  { key: 'defects', label: 'Defects', icon: AlertCircle, path: '/items/defects', color: 'bg-red-500' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/items/tasks', color: 'bg-blue-500' }
];

const otherItems = [
  { key: 'objectives', label: 'Objectives', icon: Target, path: '/items/objectives', color: 'bg-slate-600' },
  { key: 'dependencies', label: 'Dependencies', icon: GitBranch, path: '/items/dependencies', color: 'bg-slate-600' },
  { key: 'ideation', label: 'Ideation', icon: Lightbulb, path: '/items/ideation', color: 'bg-slate-600' },
  { key: 'risks', label: 'Risks', icon: AlertTriangle, path: '/items/risks', color: 'bg-slate-600' },
  { key: 'impediments', label: 'Impediments', icon: Shield, path: '/items/impediments', color: 'bg-slate-600' },
  { key: 'sprints', label: 'Sprints', icon: Calendar, path: '/items/sprints', color: 'bg-slate-600' },
  { key: 'program-increments', label: 'Program Increments', icon: Package, path: '/items/program-increments', color: 'bg-slate-600' },
  { key: 'release-vehicles', label: 'Release Vehicles (Fix Versions)', icon: Package, path: '/items/release-vehicles', color: 'bg-slate-600' },
  { key: 'success-criteria', label: 'Success Criteria', icon: Award, path: '/items/success-criteria', color: 'bg-slate-600' }
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
    <div 
      className="absolute top-full right-0 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg z-50"
      role="menu"
      aria-label="Work items menu"
    >
      <ScrollArea className="max-h-96">
        <div className="p-2">
          <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase">WORK ITEMS</p>
          {workItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleClick(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent text-left transition-colors focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              role="menuitem"
              tabIndex={0}
            >
              <div className={`w-6 h-6 rounded ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-foreground">{item.label}</span>
            </button>
          ))}

          <div className="my-2 border-t border-border" />

          <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase">OTHER</p>
          {otherItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleClick(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent text-left transition-colors focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              role="menuitem"
              tabIndex={0}
            >
              <div className={`w-6 h-6 rounded ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
