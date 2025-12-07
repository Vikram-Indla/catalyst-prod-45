import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  AlertCircle, 
  Tag, 
  Calendar, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReleaseRoomSidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
}

const STORAGE_KEY = 'release-sidebar-collapsed';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/release/overview' },
  { label: 'Incidents', icon: AlertCircle, path: '/release/incidents' },
  { label: 'Versions', icon: Tag, path: '/release/versions' },
  { label: 'Calendar', icon: Calendar, path: '/release/calendar' },
];

export function ReleaseRoomSidebar({ expanded: controlledExpanded, onToggle }: ReleaseRoomSidebarProps) {
  const location = useLocation();
  
  // Use localStorage for persistence
  const [internalExpanded, setInternalExpanded] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== 'true'; // Default expanded, stored as collapsed state
  });

  const expanded = controlledExpanded ?? internalExpanded;

  const handleToggle = () => {
    const newExpanded = !expanded;
    setInternalExpanded(newExpanded);
    localStorage.setItem(STORAGE_KEY, (!newExpanded).toString());
    onToggle?.();
  };

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, (!expanded).toString());
  }, [expanded]);

  const isActive = (path: string) => {
    if (path === '/release/incidents') {
      return location.pathname.startsWith('/release/incidents');
    }
    if (path === '/release/versions') {
      return location.pathname.startsWith('/release/versions');
    }
    return location.pathname === path;
  };

  return (
    <aside
      className={cn(
        "h-full bg-white border-r border-[#E8E8E8] flex flex-col transition-all duration-200",
        expanded ? "w-[240px]" : "w-[56px]"
      )}
    >
      {/* Header */}
      <div className="h-[72px] border-b border-[#E8E8E8] flex items-center px-3 gap-3">
        {/* Badge */}
        <div 
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(198, 156, 109, 0.1)' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#C69C6D' }}>PR</span>
        </div>
        
        {expanded && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#1A1A1A] truncate">Product</div>
            <div className="text-xs text-[#8C8C8C] truncate">Industry</div>
          </div>
        )}
        
        {/* Collapse button */}
        <button
          onClick={handleToggle}
          className="w-6 h-6 flex items-center justify-center text-[#5C5C5C] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-colors",
                active 
                  ? "text-[#C69C6D]" 
                  : "text-[#5C5C5C] hover:bg-[#FAFAFA] hover:text-[#1A1A1A]"
              )}
              style={active ? { backgroundColor: 'rgba(198, 156, 109, 0.1)' } : undefined}
            >
              {/* Active indicator */}
              {active && (
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r"
                  style={{ backgroundColor: '#C69C6D' }}
                />
              )}
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {expanded && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="border-t border-[#E8E8E8] py-2">
        <NavLink
          to="/release/settings"
          className={cn(
            "relative flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-colors",
            isActive('/release/settings')
              ? "text-[#C69C6D]"
              : "text-[#5C5C5C] hover:bg-[#FAFAFA] hover:text-[#1A1A1A]"
          )}
          style={isActive('/release/settings') ? { backgroundColor: 'rgba(198, 156, 109, 0.1)' } : undefined}
        >
          {isActive('/release/settings') && (
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r"
              style={{ backgroundColor: '#C69C6D' }}
            />
          )}
          <Settings className="w-5 h-5 flex-shrink-0" />
          {expanded && <span className="text-sm font-medium">Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
