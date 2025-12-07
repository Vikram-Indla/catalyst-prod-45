import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, Tag, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReleaseDropdownProps {
  onClose: () => void;
}

const releaseItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/release/overview' },
  { label: 'Incidents', icon: AlertCircle, path: '/release/incidents' },
  { label: 'Versions', icon: Tag, path: '/release/versions' },
  { label: 'Calendar', icon: Calendar, path: '/release/calendar' },
];

export function ReleaseDropdown({ onClose }: ReleaseDropdownProps) {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="w-64 p-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">
        Release Management
      </div>
      <div className="space-y-0.5">
        {releaseItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors",
              "text-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
