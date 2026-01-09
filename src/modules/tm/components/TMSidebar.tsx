/**
 * TM Sidebar - Phase 1 Spec Compliant
 * 220px width, 44px item height, 52px header
 * Blue primary for active, proper badge colors
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Layers,
  RefreshCw,
  Play,
  Bug,
  Target,
  GitBranch,
  BarChart3,
  Settings,
  User,
  FlaskConical,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface NavItem {
  path?: string;
  label?: string;
  icon?: React.ElementType;
  badge?: number;
  badgeColor?: 'default' | 'warning' | 'danger';
  section?: string;
  disabled?: boolean;
  comingSoon?: string;
}

const navItems: NavItem[] = [
  // Overview Section
  { section: 'OVERVIEW' },
  { path: '/tm/dashboard', label: 'Dashboard', icon: LayoutDashboard, comingSoon: 'Phase 10' },
  { path: '/tm/my-work', label: 'My Work', icon: User, badge: 12, comingSoon: 'Phase 10' },
  
  // Repository Section
  { section: 'REPOSITORY' },
  { path: '/tm/cases', label: 'Test Cases', icon: FileText, badge: 248 },
  { path: '/tm/sets', label: 'Test Sets', icon: Layers, badge: 8, comingSoon: 'Phase 5' },
  
  // Execution Section
  { section: 'EXECUTION' },
  { path: '/tm/cycles', label: 'Test Cycles', icon: RefreshCw, badge: 5, comingSoon: 'Phase 6' },
  { path: '/tm/runs', label: 'Active Runs', icon: Play, badge: 2, badgeColor: 'warning', comingSoon: 'later phases' },
  
  // Traceability Section
  { section: 'TRACEABILITY' },
  { path: '/tm/defects', label: 'Defects', icon: Bug, badge: 23, badgeColor: 'danger', comingSoon: 'Phase 7' },
  { path: '/tm/requirements', label: 'Requirements', icon: Target, badge: 47, comingSoon: 'Phase 9' },
  { path: '/tm/traceability', label: 'Traceability', icon: GitBranch, comingSoon: 'Phase 9' },
  
  // Analytics Section
  { section: 'ANALYTICS' },
  { path: '/tm/reports', label: 'Reports', icon: BarChart3, comingSoon: 'Phase 10' },
];

export function TMSidebar() {
  const location = useLocation();

  const handleDisabledClick = (item: NavItem) => (e: React.MouseEvent) => {
    if (item.comingSoon) {
      e.preventDefault();
      toast.info(`${item.label} coming in ${item.comingSoon}`);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      className="flex flex-col border-r bg-[var(--bg-0)]"
      style={{
        width: '220px',
        minWidth: '220px',
        borderColor: 'var(--stroke-1)',
      }}
    >
      {/* Header - 52px height */}
      <div
        className="flex items-center gap-2 px-4"
        style={{
          height: '52px',
          borderBottom: '1px solid var(--stroke-1)',
        }}
      >
        {/* TM Badge - 32x32px */}
        <div
          className="flex items-center justify-center rounded-md bg-[#2563eb]"
          style={{ width: '32px', height: '32px' }}
        >
          <FlaskConical className="h-[18px] w-[18px] text-white" />
        </div>
        <span
          className="font-semibold"
          style={{ fontSize: '14px', color: 'var(--text-1)' }}
        >
          Test Management
        </span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-2">
          {navItems.map((item, index) => {
            // Section header
            if (item.section) {
              return (
                <div
                  key={`section-${index}`}
                  className="px-4 pb-1.5 pt-4 first:pt-2"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    color: 'var(--text-4)',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.section}
                </div>
              );
            }

            const Icon = item.icon!;
            const active = item.path ? isActive(item.path) : false;
            const disabled = !!item.comingSoon;

            return (
              <NavLink
                key={item.path}
                to={item.path!}
                onClick={disabled ? handleDisabledClick(item) : undefined}
                className={cn(
                  'group flex items-center gap-3 mx-2 rounded-md transition-colors relative',
                  active
                    ? 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]'
                    : 'text-[var(--text-2)] hover:bg-[var(--row-hover)] hover:text-[var(--text-1)]',
                  disabled && 'opacity-70'
                )}
                style={{
                  height: '44px',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {/* Active indicator bar */}
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[#2563eb]"
                    style={{ height: '24px' }}
                  />
                )}
                
                <Icon 
                  className="shrink-0" 
                  style={{ 
                    width: '18px', 
                    height: '18px',
                    color: active ? '#2563eb' : 'var(--text-3)'
                  }} 
                />
                
                <span className="flex-1">{item.label}</span>
                
                {/* Badge */}
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-full text-[10px] font-medium min-w-[20px] px-1.5',
                      active
                        ? 'bg-[#2563eb] text-white'
                        : item.badgeColor === 'warning'
                        ? 'bg-[rgba(217,119,6,0.12)] text-[#d97706]'
                        : item.badgeColor === 'danger'
                        ? 'bg-[rgba(220,38,38,0.12)] text-[#dc2626]'
                        : 'bg-[var(--bg-2)] text-[var(--text-3)]'
                    )}
                    style={{ height: '20px', borderRadius: '10px' }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer - Settings */}
      <div
        className="px-2 py-2"
        style={{ borderTop: '1px solid var(--stroke-1)' }}
      >
        <NavLink
          to="/tm/settings"
          onClick={(e) => {
            e.preventDefault();
            toast.info('Settings coming in later phases');
          }}
          className={cn(
            'flex items-center gap-3 rounded-md transition-colors',
            'text-[var(--text-2)] hover:bg-[var(--row-hover)] hover:text-[var(--text-1)]'
          )}
          style={{
            height: '44px',
            padding: '0 12px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <Settings style={{ width: '18px', height: '18px', color: 'var(--text-3)' }} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default TMSidebar;
