import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LayoutDashboard, AlertCircle, Tag, Calendar, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarSectionHeader } from './SidebarSectionHeader';

interface ReleaseRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const menuItems = [
  { title: 'Release Room', path: '/release/overview', icon: LayoutDashboard, exact: true },
  { title: 'Incidents', path: '/release/incidents', icon: AlertCircle, exact: false },
  { title: 'Dashboard', path: '/release/incidents/dashboard', icon: BarChart3, exact: true },
  { title: 'Versions', path: '/release/versions', icon: Tag, exact: false },
  { title: 'Calendar', path: '/release/calendar', icon: Calendar, exact: true },
];

export function ReleaseRoomSidebar({ expanded, onToggle, className }: ReleaseRoomSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col overflow-visible',
          expanded ? 'w-48' : 'w-16',
          className
        )}
      >
        {/* Toggle Handle - positioned outside sidebar */}
        <button
          onClick={onToggle}
          className="absolute right-0 translate-x-1/2 top-6 z-50 w-6 h-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-accent transition-transform"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Section Header */}
        <SidebarSectionHeader
          badge="RL"
          label="Release"
          expanded={expanded}
          height={52}
        />

        {/* Navigation Menu */}
        <nav className="p-2 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);

            if (!expanded) {
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'w-full h-10 flex items-center justify-center',
                        active && 'bg-[rgba(92,124,92,0.08)] text-[#5c7c5c]'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover border">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Button
                key={item.title}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full justify-start gap-3 h-10',
                  active && 'bg-[rgba(92,124,92,0.08)] text-[#5c7c5c]'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Button>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="flex-1" />
        <div className="p-2 border-t">
          {!expanded ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/release/settings')}
                    className={cn(
                      'w-full h-10 flex items-center justify-center',
                      isActive('/release/settings', true) && 'bg-[rgba(92,124,92,0.08)] text-[#5c7c5c]'
                    )}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover border">
                Release Settings
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={() => navigate('/release/settings')}
              className={cn(
                'w-full justify-start gap-3 h-10',
                isActive('/release/settings', true) && 'bg-[rgba(92,124,92,0.08)] text-[#5c7c5c]'
              )}
            >
              <Settings className="h-5 w-5" />
              <span>Release Settings</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
