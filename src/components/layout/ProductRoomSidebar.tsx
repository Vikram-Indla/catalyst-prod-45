import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarSectionHeader } from './SidebarSectionHeader';
import { PRODUCT_ROOM_NAV_ICONS } from '@/components/icons/ProductRoomNavIcons';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const menuItems = [
  { title: 'Product Room', path: '/product/room', exact: true },
  { title: 'Product Backlog', path: '/industry/backlog', exact: false },
  { title: 'Product Kanban', path: '/industry/kanban', exact: true },
  { title: 'Product Roadmap', path: '/industry/roadmaps', exact: false },
  { title: 'Product Capacity', path: '/product/capacity', exact: true },
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
          className
        )}
        style={{ width: expanded ? '220px' : '60px' }}
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
          badge="PR"
          label="Product"
          expanded={expanded}
        />

        {/* Navigation Menu */}
        <nav className="p-2 space-y-1">
        {menuItems.map(item => {
            const CustomIcon = PRODUCT_ROOM_NAV_ICONS[item.title];
            const active = isActive(item.path, item.exact);

            if (!expanded) {
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'w-full h-10 flex items-center justify-center rounded-md transition-all relative group',
                        active && 'bg-[rgba(92,124,92,0.08)]'
                      )}
                      style={active ? { color: '#5c7c5c' } : { color: '#4b5563' }}
                    >
                      {/* Olive left border indicator for active state */}
                      {active && (
                        <span 
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                          style={{ backgroundColor: '#5c7c5c' }}
                        />
                      )}
                      {CustomIcon && <CustomIcon className="h-5 w-5 group-hover:text-brand-gold-hover" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover border">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <button
                key={item.title}
                onClick={() => {
                  navigate(item.path);
                  onToggle(); // Collapse sidebar on click
                }}
                className={cn(
                  'w-full h-10 flex items-center gap-3 px-3 rounded-md transition-all relative text-left group',
                  active && 'bg-[rgba(92,124,92,0.08)] font-semibold'
                )}
                style={active ? { color: '#5c7c5c' } : { color: '#4b5563' }}
              >
                {/* Olive left border indicator for active state */}
                {active && (
                  <span 
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                    style={{ backgroundColor: '#5c7c5c' }}
                  />
                )}
                {CustomIcon && <CustomIcon className="h-5 w-5 group-hover:text-brand-gold-hover" />}
                <span className="text-[13px] font-medium">{item.title}</span>
              </button>
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
