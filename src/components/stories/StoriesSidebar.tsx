import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Grid3x3,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoriesSidebarProps {
  className?: string;
}

const menuItems = [
  { id: 'stories-grid', label: 'Stories', icon: Grid3x3, path: '/stories' },
];

export function StoriesSidebar({ className }: StoriesSidebarProps) {
  const [expanded, setExpanded] = useState(() => {
    // Collapse by default on mobile/tablet, expand on desktop
    return window.innerWidth >= 1024;
  });
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col",
        expanded ? "w-[280px]" : "w-16",
        className
      )}
    >
      {/* Toggle Handle - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute -right-3 top-6 z-[100] w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent hover:border-brand-gold transition-all"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <ChevronLeft className="h-4 w-4 text-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-foreground" />
        )}
      </button>

      <div className="h-full flex flex-col overflow-hidden">
        {/* Context Header */}
        <div className={cn("px-4 pt-4 pb-3 border-b", !expanded && "px-2")}>
          {expanded && (
            <>
              {/* Stories Context Block */}
              <div className="py-2 px-3 mb-3 bg-accent/30 border border-border/50 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded bg-brand-gold flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      Stories
                    </div>
                    <div className="text-xs text-muted-foreground">User Story Management</div>
                  </div>
                </div>
              </div>
            </>
          )}
          {!expanded && (
            <div className="flex items-center justify-center py-2">
              <BookOpen className="h-5 w-5 text-brand-gold" />
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal transition-colors",
                  "hover:bg-accent/50",
                  active && "bg-accent text-primary font-medium",
                  !expanded && "justify-center px-2"
                )}
                title={!expanded ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                {expanded && <span className="truncate text-left flex-1">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="border-t">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Story Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
