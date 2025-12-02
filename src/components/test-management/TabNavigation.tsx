import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, FileText, FolderKanban, ListChecks, PlayCircle, BarChart3 } from 'lucide-react';

interface TabNavigationProps {
  programId: string;
}

const tabs = [
  { path: 'overview', label: 'Overview', icon: Home },
  { path: 'cases', label: 'Cases', icon: FileText },
  { path: 'sets', label: 'Sets', icon: FolderKanban },
  { path: 'cycles', label: 'Cycles', icon: ListChecks },
  { path: 'executions', label: 'Executions', icon: PlayCircle },
  { path: 'reports', label: 'Reports', icon: BarChart3 },
];

export function TabNavigation({ programId }: TabNavigationProps) {
  const location = useLocation();
  
  const isActive = (tabPath: string) => {
    const currentPath = location.pathname;
    return currentPath.includes(`/tests/${tabPath}`);
  };

  return (
    <nav className="flex gap-1 border-b -mb-[1px]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.path);
        
        return (
          <Link
            key={tab.path}
            to={`/programs/${programId}/tests/${tab.path}`}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              active
                ? 'border-brand-gold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
