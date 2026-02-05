/**
 * MobileBottomNav — Bottom navigation for mobile/tablet TaskHub
 * 
 * Shows on screens < 1024px when sidebar is hidden
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  LayoutGrid, 
  Target,
  Menu,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/taskhub/dashboard', icon: LayoutDashboard },
  { id: 'my-tasks', label: 'My Tasks', path: '/taskhub/my-tasks', icon: CheckSquare },
  { id: 'boards', label: 'Boards', path: '/taskhub/boards', icon: LayoutGrid },
  { id: 'task10', label: 'Priorities¹⁰', path: '/taskhub/task10', icon: Target },
];

interface MobileBottomNavProps {
  onMenuClick?: () => void;
  menuOpen?: boolean;
}

export function MobileBottomNav({ onMenuClick, menuOpen }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={cn(
              'mobile-bottom-nav-item',
              active && 'active'
            )}
          >
            <Icon 
              style={{ 
                width: 20, 
                height: 20,
                strokeWidth: active ? 2 : 1.75 
              }} 
            />
            <span>{item.label}</span>
          </button>
        );
      })}
      
      {/* More menu button */}
      <button
        onClick={onMenuClick}
        className={cn(
          'mobile-bottom-nav-item',
          menuOpen && 'active'
        )}
      >
        {menuOpen ? (
          <X style={{ width: 20, height: 20 }} />
        ) : (
          <Menu style={{ width: 20, height: 20 }} />
        )}
        <span>More</span>
      </button>
    </nav>
  );
}

export default MobileBottomNav;
