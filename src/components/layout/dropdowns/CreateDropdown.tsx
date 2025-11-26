import { useNavigate } from 'react-router-dom';
import { 
  Layers, Diamond, Box, Zap, BookOpen, AlertCircle, CheckSquare,
  Target, GitBranch, Lightbulb, AlertTriangle, Shield, Calendar, Package, Award
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const workItems = [
  { label: 'Theme', icon: Layers },
  { label: 'Epic', icon: Diamond },
  { label: 'Capability', icon: Box },
  { label: 'Feature', icon: Zap },
  { label: 'Story', icon: BookOpen },
  { label: 'Defect', icon: AlertCircle },
  { label: 'Task', icon: CheckSquare }
];

const otherItems = [
  { label: 'Objective', icon: Target },
  { label: 'Dependency', icon: GitBranch },
  { label: 'Ideation', icon: Lightbulb },
  { label: 'Risk', icon: AlertTriangle },
  { label: 'Impediment', icon: Shield },
  { label: 'Sprint', icon: Calendar },
  { label: 'Program Increment', icon: Package },
  { label: 'Release Vehicle (Fix Version)', icon: Package },
  { label: 'Success Criteria', icon: Award }
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
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <item.icon className="h-4 w-4 text-primary" />
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
