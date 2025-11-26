import { useNavigate } from 'react-router-dom';
import { 
  Layers, Diamond, Box, Zap, BookOpen, AlertCircle, CheckSquare,
  Target, GitBranch, Lightbulb, AlertTriangle, Shield, Calendar, Package, Award
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const workItems = [
  { label: 'Theme', icon: Layers, color: 'bg-emerald-500' },
  { label: 'Epic', icon: Diamond, color: 'bg-blue-500' },
  { label: 'Capability', icon: Box, color: 'bg-amber-500' },
  { label: 'Feature', icon: Zap, color: 'bg-purple-600' },
  { label: 'Story', icon: BookOpen, color: 'bg-teal-500' },
  { label: 'Defect', icon: AlertCircle, color: 'bg-red-500' },
  { label: 'Task', icon: CheckSquare, color: 'bg-blue-400' }
];

const otherItems = [
  { label: 'Objective', icon: Target, color: 'bg-slate-600' },
  { label: 'Dependency', icon: GitBranch, color: 'bg-slate-600' },
  { label: 'Ideation', icon: Lightbulb, color: 'bg-slate-600' },
  { label: 'Risk', icon: AlertTriangle, color: 'bg-slate-600' },
  { label: 'Impediment', icon: Shield, color: 'bg-slate-600' },
  { label: 'Sprint', icon: Calendar, color: 'bg-slate-600' },
  { label: 'Program Increment', icon: Package, color: 'bg-slate-600' },
  { label: 'Release Vehicle (Fix Version)', icon: Package, color: 'bg-slate-600' },
  { label: 'Success Criteria', icon: Award, color: 'bg-slate-600' }
];

interface CreateDropdownProps {
  onClose: () => void;
}

export function CreateDropdown({ onClose }: CreateDropdownProps) {
  const navigate = useNavigate();

  const handleClick = (label: string) => {
    // Placeholder - would open create dialog
    console.log('Create:', label);
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-1 w-64 bg-popover border rounded-md shadow-lg z-50">
      <ScrollArea className="max-h-96">
        <div className="p-2">
          <p className="text-xs font-semibold text-muted-foreground px-3 py-2">WORK ITEMS</p>
          {workItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleClick(item.label)}
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
              onClick={() => handleClick(item.label)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent text-left"
            >
              <div className={`w-6 h-6 rounded ${item.color} flex items-center justify-center`}>
                <item.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
