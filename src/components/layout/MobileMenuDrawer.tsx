/**
 * MobileMenuDrawer — Full menu drawer for mobile/tablet
 * 
 * Shows all navigation items when "More" is tapped
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, 
  Layers,
  CheckSquare, 
  LayoutGrid, 
  List,
  GanttChartSquare,
  Target,
  Settings,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string | React.ReactNode;
  path: string;
  icon: React.ElementType;
}

const allNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/taskhub/dashboard', icon: LayoutDashboard },
  { id: 'workstreams', label: 'Workstreams', path: '/taskhub/workstreams', icon: Layers },
  { id: 'my-tasks', label: 'My Tasks', path: '/taskhub/my-tasks', icon: CheckSquare },
  { id: 'boards', label: 'Boards', path: '/taskhub/boards', icon: LayoutGrid },
  { id: 'task-list', label: 'Task List', path: '/taskhub/task-list', icon: List },
  { id: 'timeline', label: 'Timeline', path: '/taskhub/timeline', icon: GanttChartSquare },
  { 
    id: 'task10', 
    label: (
      <span className="flex items-center gap-2">
        Task
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
          10
        </span>
      </span>
    ), 
    path: '/taskhub/task10', 
    icon: Target 
  },
  { id: 'settings', label: 'Settings', path: '/taskhub/settings', icon: Settings },
];

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl"
        style={{
          maxHeight: 'calc(100vh - 100px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">TaskHub</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-1 overflow-y-auto max-h-[60vh]">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                  active 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon 
                  className={cn(
                    'w-5 h-5',
                    active ? 'text-blue-600' : 'text-slate-400'
                  )}
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="font-medium">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MobileMenuDrawer;
