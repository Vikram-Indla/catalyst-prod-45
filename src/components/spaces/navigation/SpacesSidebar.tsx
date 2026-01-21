// ════════════════════════════════════════════════════════════════════════════
// SPACES SIDEBAR (Left navigation within a space)
// ════════════════════════════════════════════════════════════════════════════

import { Link, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  LayoutGrid,
  List,
  GanttChart,
  FileText,
  Code,
  Package,
  BarChart3,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpace } from '@/hooks/spaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { SpaceAvatar } from '../shared/SpaceAvatar';
import { SPACE_NAV_SECTIONS } from '@/lib/space-constants';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  LayoutGrid,
  List,
  GanttChart,
  FileText,
  Code,
  Package,
  BarChart3,
  Zap,
  Settings,
};

export function SpacesSidebar() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useSpaceStore();
  const { data: space, isLoading } = useSpace(spaceId);

  if (isLoading || !space) {
    return (
      <aside
        className={cn(
          'h-full bg-background border-r border-border flex flex-col transition-all duration-200',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-border">
            <div className="h-10 bg-muted animate-pulse rounded-md" />
          </div>
        )}
      </aside>
    );
  }

  const basePath = `/spaces/${spaceId}`;

  return (
    <aside
      className={cn(
        'h-full bg-background border-r border-border flex flex-col transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Space Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <SpaceAvatar
          name={space.name}
          spaceKey={space.key}
          color={space.color}
          size={sidebarCollapsed ? 'sm' : 'md'}
        />
        {!sidebarCollapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm text-foreground truncate">
              {space.name}
            </h2>
            <span className="text-xs text-muted-foreground">{space.key}</span>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors z-10"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-2">
        {SPACE_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            {!sidebarCollapsed && (
              <div className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = iconMap[item.icon];
              const fullPath = `${basePath}${item.href}`;
              const isActive = location.pathname === fullPath;

              return (
                <Link
                  key={item.key}
                  to={fullPath}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {Icon && <Icon className="w-[18px] h-[18px] shrink-0" />}
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings Link */}
      <div className="border-t border-border py-2">
        <Link
          to={`${basePath}/settings`}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2 text-sm transition-colors',
            location.pathname.startsWith(`${basePath}/settings`)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          title={sidebarCollapsed ? 'Space Settings' : undefined}
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          {!sidebarCollapsed && <span>Space Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
