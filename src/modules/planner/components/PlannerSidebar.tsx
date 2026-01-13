// ============================================================
// PLANNER SIDEBAR COMPONENT
// Left navigation with views, insights, and presence
// Uses SidebarBase for consistent styling with other modules
// ============================================================

import { 
  LayoutGrid, 
  List, 
  Calendar, 
  GanttChartSquare,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  UsersRound,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PlannerView } from '../types';

interface PlannerSidebarProps {
  activeView: PlannerView;
  onViewChange: (view: PlannerView) => void;
  onlineUsers?: { id: string; initials: string; color: string }[];
  insightsBadge?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Sidebar menu structure
const VIEWS_SECTION = [
  { id: 'boards', title: 'Boards', path: '/planner/boards', icon: LayoutGrid },
  { id: 'task-list', title: 'Task List', path: '/planner/task-list', icon: List },
  { id: 'timeline', title: 'Timeline', path: '/planner/timeline', icon: GanttChartSquare },
  { id: 'calendar', title: 'Calendar', path: '/planner/calendar', icon: Calendar },
];

const INSIGHTS_SECTION = [
  { id: 'weekly-report', title: 'Weekly Report', path: '/planner/weekly-report', icon: FileText },
  { id: 'workstream-performance', title: 'Workstream Performance', path: '/planner/workstream-performance', icon: Users },
];

const WORKSPACE_SECTION = [
  { id: 'workstreams', title: 'Workstreams', path: '/planner/workstreams', icon: UsersRound },
];

export function PlannerSidebar({
  activeView,
  onViewChange,
  onlineUsers = [],
  insightsBadge = 0,
  collapsed = false,
  onToggleCollapse,
}: PlannerSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const expanded = !collapsed;

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const renderMenuItem = (item: typeof VIEWS_SECTION[0] & { hasBadge?: boolean }) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    const showBadge = item.hasBadge && insightsBadge > 0;

    const menuButton = (
      <button
        onClick={() => handleNavigation(item.path)}
        style={{
          width: '100%',
          height: '44px',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.15s ease, color 0.15s ease',
          marginBottom: '2px',
          position: 'relative',
          background: active ? 'var(--nav-active-bg)' : 'transparent',
          color: active ? 'hsl(var(--brand-primary))' : 'hsl(var(--foreground))',
          fontWeight: active ? 600 : 500,
          fontSize: '13px',
          fontFamily: 'inherit',
          outline: 'none',
        }}
        onMouseEnter={(e) => { 
          if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
        }}
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = active ? 'var(--nav-active-bg)' : 'transparent'; 
        }}
      >
        {/* Left indicator bar for active state */}
        {active && (
          <span 
            style={{
              position: 'absolute',
              left: 0,
              top: '6px',
              bottom: '6px',
              width: '3px',
              background: 'hsl(var(--brand-primary))',
              borderRadius: '0 2px 2px 0',
            }}
          />
        )}
        {/* Icon container */}
        <span style={{ 
          width: '32px',
          height: '32px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: expanded ? '6px' : '14px',
        }}>
          <Icon 
            className="h-[18px] w-[18px]" 
            style={{ color: active ? 'hsl(var(--brand-primary))' : 'hsl(var(--foreground) / 0.7)' }}
          />
        </span>
        {expanded && (
          <span style={{ 
            flex: 1, 
            textAlign: 'left',
            lineHeight: '44px',
          }}>{item.title}</span>
        )}
        {showBadge && (
          <span 
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '9999px',
              background: 'hsl(var(--destructive))',
              color: 'hsl(var(--destructive-foreground))',
              minWidth: '18px',
              textAlign: 'center',
              marginRight: expanded ? '10px' : '0',
              position: expanded ? 'relative' : 'absolute',
              top: expanded ? 'auto' : '6px',
              right: expanded ? 'auto' : '6px',
            }}
          >
            {insightsBadge > 99 ? '99+' : insightsBadge}
          </span>
        )}
      </button>
    );

    if (!expanded) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            {menuButton}
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            className="z-[100] bg-popover text-popover-foreground border border-border shadow-md"
          >
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{menuButton}</div>;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className="h-full transition-all duration-300 flex-shrink-0 relative flex flex-col overflow-visible"
        style={{ 
          width: expanded ? '220px' : '60px',
          background: 'var(--surface-elevated, var(--surface-1))',
          borderRight: '1px solid var(--divider)',
          boxShadow: '1px 0 3px 0 rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Toggle Handle */}
        <button
          onClick={onToggleCollapse}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '24px',
            zIndex: 50,
            width: '24px',
            height: '24px',
            borderRadius: '9999px',
            background: 'var(--surface-1)',
            border: '1px solid var(--divider)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--icon-default)',
          }}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? (
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
          ) : (
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          )}
        </button>

        {/* Header */}
        <div 
          style={{ 
            height: '52px',
            padding: expanded ? '0 12px' : '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderBottom: '1px solid var(--divider)',
            flexShrink: 0,
          }}
        >
          <div 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--brand-primary-hex, #2563eb)',
              color: 'var(--text-inverse, #ffffff)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            PL
          </div>
          {expanded && (
            <div style={{ marginLeft: '10px' }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 700, 
                color: 'var(--text-1)' 
              }}>
                Planner
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
          {/* Views Section */}
          <div style={{ marginBottom: '16px' }}>
            {expanded && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-tertiary)',
                  padding: '8px 12px 4px',
                }}
              >
                Views
              </div>
            )}
            {VIEWS_SECTION.map(renderMenuItem)}
          </div>

          {/* Insights Section */}
          <div>
            {expanded && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-tertiary)',
                  padding: '8px 12px 4px',
                  marginTop: '8px',
                }}
              >
                Insights
              </div>
            )}
            {INSIGHTS_SECTION.map(renderMenuItem)}
          </div>

          {/* Workspace Section */}
          <div>
            {expanded && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-tertiary)',
                  padding: '8px 12px 4px',
                  marginTop: '8px',
                }}
              >
                Workspace
              </div>
            )}
            {WORKSPACE_SECTION.map(renderMenuItem)}
          </div>
        </nav>

        {/* Online Users Section */}
        {onlineUsers.length > 0 && (
          <div style={{ 
            borderTop: '1px solid var(--divider)', 
            padding: expanded ? '12px' : '8px',
          }}>
            {expanded && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-tertiary)',
                  marginBottom: '8px',
                }}
              >
                Online Now
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '6px',
              justifyContent: expanded ? 'flex-start' : 'center',
            }}>
              {onlineUsers.slice(0, expanded ? 8 : 3).map(user => (
                <Tooltip key={user.id}>
                  <TooltipTrigger asChild>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: user.color,
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: 'default',
                      }}
                    >
                      {user.initials}
                      {/* Online indicator */}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '0',
                          right: '0',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#10b981',
                          border: '2px solid var(--surface-1)',
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="z-[100]">
                    {user.initials} - Online
                  </TooltipContent>
                </Tooltip>
              ))}
              {!expanded && onlineUsers.length > 3 && (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--muted)',
                    color: 'var(--muted-foreground)',
                    fontSize: '10px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  +{onlineUsers.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Footer */}
        <div style={{ borderTop: '1px solid var(--divider)', padding: '6px' }}>
          {renderMenuItem({ 
            id: 'settings', 
            title: 'Settings', 
            path: '/planner/settings', 
            icon: Settings 
          })}
        </div>
      </aside>
    </TooltipProvider>
  );
}
