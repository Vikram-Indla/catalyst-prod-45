/**
 * WorkHubSidebar — Fixed sidebar with 9 navigation items
 * - 240px wide, fixed left, active state with blue bg + 3px border
 * - Footer shows "Last sync" timestamp
 * - Responsive: collapses on mobile with hamburger overlay
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileStack,
  Rocket,
  Palette,
  Users,
  CalendarDays,
  BarChart3,
  PieChart,
  Sparkles,
  RefreshCw,
  Menu,
  X,
} from 'lucide-react';
import { WORKHUB_NAV_ITEMS } from '@/lib/workhub/constants';
import '@/styles/workhub.module.css';

const iconMap: Record<string, any> = {
  LayoutDashboard,
  FileStack,
  Rocket,
  Palette,
  Users,
  CalendarDays,
  BarChart3,
  PieChart,
  Sparkles,
};

interface WorkHubSidebarProps {
  onNavigate?: () => void; // Called when mobile nav item clicked (to close overlay)
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  catyOpen?: boolean;
  onCatyToggle?: () => void;
}

export function WorkHubSidebar({
  onNavigate,
  isMobileOpen = false,
  onMobileClose,
  catyOpen = false,
  onCatyToggle,
}: WorkHubSidebarProps) {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getIsActive = (path: string) => {
    if (path === '/projecthub') {
      return location.pathname === '/projecthub';
    }
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <>
      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {WORKHUB_NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = item.label === 'Caty AI' ? catyOpen : getIsActive(item.path);

          // Caty AI item: click toggles panel, doesn't navigate
          if (item.label === 'Caty AI') {
            return (
              <button
                key={item.path}
                onClick={() => {
                  onCatyToggle?.();
                  onNavigate?.();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all relative group text-left"
                style={{
                  backgroundColor: isActive ? 'var(--wh-primary-light)' : 'transparent',
                  color: isActive ? 'var(--wh-primary)' : 'var(--wh-text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {/* Left border (3px when active) */}
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-l transition-all"
                  style={{
                    width: isActive ? '3px' : '0px',
                    backgroundColor: 'var(--wh-primary)',
                  }}
                />

                {/* Icon */}
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />

                {/* Label */}
                <span className="text-sm flex-1 ml-1">{item.label}</span>

                {/* Hover background (when not active) */}
                {!isActive && (
                  <div
                    className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity -z-10"
                    style={{ backgroundColor: 'var(--wh-border-light)' }}
                  />
                )}
              </button>
            );
          }

          // Regular nav items
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onNavigate?.()}
              className="flex items-center gap-3 px-3 py-2.5 rounded transition-all relative group"
              style={{
                backgroundColor: isActive ? 'var(--wh-primary-light)' : 'transparent',
                color: isActive ? 'var(--wh-primary)' : 'var(--wh-text-secondary)',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {/* Left border (3px when active) */}
              <div
                className="absolute left-0 top-0 bottom-0 rounded-l transition-all"
                style={{
                  width: isActive ? '3px' : '0px',
                  backgroundColor: 'var(--wh-primary)',
                }}
              />

              {/* Icon */}
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />

              {/* Label */}
              <span className="text-sm flex-1 ml-1">{item.label}</span>

              {/* Hover background (when not active) */}
              {!isActive && (
                <div
                  className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity -z-10"
                  style={{ backgroundColor: 'var(--wh-border-light)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t text-xs"
        style={{
          borderColor: 'var(--wh-border)',
          color: 'var(--wh-text-tertiary)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-3 h-3" />
          <span className="font-medium">Last sync:</span>
        </div>
        <span>
          {new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </>
  );

  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[var(--wh-z-drawer)] bg-black/30"
              onClick={onMobileClose}
              style={{ zIndex: 'calc(var(--wh-z-drawer) - 1)' }}
            />

            {/* Sidebar Drawer */}
            <div
              className="fixed left-0 top-0 h-screen w-60 bg-white border-r flex flex-col shadow-lg animate-in slide-in-from-left duration-200"
              style={{
                borderColor: 'var(--wh-border)',
                zIndex: 'var(--wh-z-drawer)',
              }}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold" style={{ color: 'var(--wh-text-primary)' }}>
                  ProjectHub
                </h2>
                <button onClick={onMobileClose} className="p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </div>
          </>
        )}
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <div
      className="fixed left-0 top-[var(--wh-topnav-height)] w-60 h-[calc(100vh-var(--wh-topnav-height))] bg-white border-r flex flex-col"
      style={{
        borderColor: 'var(--wh-border)',
        width: 'var(--wh-sidebar-width)',
      }}
    >
      {sidebarContent}
    </div>
  );
}
