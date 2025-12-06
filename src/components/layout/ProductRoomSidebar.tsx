import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Box, ListTree, Map, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const menuItems = [
  { title: 'Demand Summary', path: '/industry/demand-summary', icon: Box, exact: true },
  { title: 'Backlog', path: '/industry', icon: ListTree, exact: true },
  { title: 'Roadmaps', path: '/industry/roadmaps', icon: Map, exact: false },
  { title: 'Knowledge Hub', path: '/knowledge-hub', icon: BookOpen, exact: false },
];

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
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
          'h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col',
          expanded ? 'w-48' : 'w-16',
          className
        )}
      >
        {/* Toggle Handle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-accent transition-transform"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Header - matches page header height */}
        <div className="px-4 py-4 border-b border-border flex items-center shrink-0">
          {expanded ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm">
                PR
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Demand Intake</span>
                <span className="text-xs text-muted-foreground">Industry-specific demand requests</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm mx-auto">
              PR
            </div>
          )}
        </div>

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
                        active && 'bg-brand-gold-pale text-brand-gold'
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
                  active && 'bg-brand-gold-pale text-brand-gold'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Button>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
