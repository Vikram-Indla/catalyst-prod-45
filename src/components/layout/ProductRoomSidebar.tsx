import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Box, ListTree, Map, BookOpen, Settings, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRole } from '@/hooks/useUserRole';
import { Separator } from '@/components/ui/separator';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const menuItems = [
  { title: 'Product Room', path: '/product/room', icon: Box, exact: true },
  { title: 'Demand Summary', path: '/industry/demand-summary', icon: ListTree, exact: true },
  { title: 'Backlog', path: '/industry', icon: ListTree, exact: true },
  { title: 'Roadmap', path: '/industry/roadmaps', icon: Map, exact: false },
  { title: 'Knowledge Hub', path: '/knowledge-hub', icon: BookOpen, exact: false },
];

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

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

        {/* Header - fixed height to align with page header (72px = py-4 + content) */}
        <div className="h-[72px] px-4 border-b border-border flex items-center shrink-0">
          {expanded ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm">
                PR
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Product</span>
                <span className="text-xs text-muted-foreground">Industry</span>
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
                onClick={() => {
                  navigate(item.path);
                  onToggle(); // Collapse sidebar on click
                }}
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

        {/* Settings Entry Point - Admin Only */}
        {isAdmin && (
          <>
            <div className="flex-1" />
            <div className="p-2 border-t">
              {!expanded ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                  variant="ghost"
                      size="icon"
                      onClick={() => toast.info('Product Settings coming soon', { icon: <Lock className="h-4 w-4" /> })}
                      className="w-full h-10 flex items-center justify-center"
                    >
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover border">
                    Product Settings (Coming Soon)
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => toast.info('Product Settings coming soon', { icon: <Lock className="h-4 w-4" /> })}
                  className="w-full justify-start gap-3 h-10"
                >
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <span>Product Settings</span>
                </Button>
              )}
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  );
}
