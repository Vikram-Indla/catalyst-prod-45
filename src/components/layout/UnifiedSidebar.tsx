/**
 * Unified Sidebar Component
 * Single sidebar component for Program and Project workspaces
 * Replaces ProgramSidebar and ProjectSidebar with shared structure
 * 
 * CATALYST V5 HARDENED:
 * - Item height: 44px (h-11) for proper touch targets
 * - Icons: 18×18 with strokeWidth 1.75
 * - Active state: 3px left border, bg-blue-50/60, text-brand-primary
 * - Footer separator: border-t border-divider
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronsLeft, 
  ChevronsRight, 
  LayoutDashboard,
  Network,
  GitBranch,
  Map,
  Grid3x3,
  Calendar,
  FileText,
  Settings,
  Square,
  Home,
  Layers,
  LayoutList,
  FlaskConical,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ads';
import { useFavorites } from '@/hooks/useFavorites';

type WorkspaceType = 'program' | 'project';

interface UnifiedSidebarProps {
  workspaceType: WorkspaceType;
  entityId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedQuarter?: string | null;
  onQuarterChange?: (quarter: string | null) => void;
  className?: string;
}

// Menu items configuration per workspace type
const menuConfigs: Record<WorkspaceType, Array<{ id: string; label: string; icon: any; pathTemplate: string; badge?: string }>> = {
  program: [
    { id: 'room', label: 'Program Room', icon: LayoutDashboard, pathTemplate: '/program/:id/room' },
    { id: 'epic-backlog', label: 'Epic Backlog', icon: Layers, pathTemplate: '/program/:id/epic-backlog' },
    { id: 'feature-backlog', label: 'Feature Backlog', icon: LayoutList, pathTemplate: '/program/:id/feature-backlog' },
    { id: 'work-tree', label: 'Work Tree', icon: Network, pathTemplate: '/program/:id/work-tree' },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch, pathTemplate: '/program/:id/dependencies' },
    { id: 'roadmaps', label: 'Roadmaps', icon: Map, pathTemplate: '/program/:id/roadmaps' },
    { id: 'epic-balancing', label: 'Epic Balancing', icon: Grid3x3, pathTemplate: '/program/:id/epic-balancing' },
    { id: 'reports', label: 'Reports', icon: FileText, pathTemplate: '/program/:id/reports' },
  ],
  project: [
    { id: 'project-room', label: 'Project Room', icon: Home, pathTemplate: '/projects/:id/work' },
    { id: 'backlog', label: 'Backlog', icon: Square, pathTemplate: '/projects/:id/backlog' },
    { id: 'roadmap', label: 'Roadmap', icon: Map, pathTemplate: '/projects/:id/roadmap' },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch, pathTemplate: '/projects/:id/dependencies' },
    { id: 'tests', label: 'Tests', icon: FlaskConical, pathTemplate: '/projects/:id/tests' },
    { id: 'reports', label: 'Reports', icon: FileText, pathTemplate: '/projects/:id/reports' },
  ],
};

function getCurrentQuarter(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

export function UnifiedSidebar({ 
  workspaceType,
  entityId, 
  expanded, 
  onToggle,
  selectedQuarter,
  onQuarterChange,
  className
}: UnifiedSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Dev-only instrumentation: prove sidebar doesn't remount on route changes
  const mountRef = useRef({ workspaceType, entityId });
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[UnifiedSidebar] mount', mountRef.current);
    }
    return () => {
      if (import.meta.env.DEV) {
        console.debug('[UnifiedSidebar] unmount', mountRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menuItems = menuConfigs[workspaceType];
  const entityLabel = workspaceType === 'program' ? 'Program' : 'Project';
  const tableName = workspaceType === 'program' ? 'programs' : 'projects';

  // Fetch entity details
  const { data: entity } = useQuery({
    queryKey: [`${workspaceType}-sidebar`, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('id, name')
        .eq('id', entityId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });

  const currentQuarter = getCurrentQuarter();
  const effectiveQuarter = selectedQuarter || currentQuarter;

  const buildNextSearch = () => {
    const params = new URLSearchParams(location.search);
    if (effectiveQuarter) {
      params.set('quarter', effectiveQuarter);
    } else {
      params.delete('quarter');
    }
    const s = params.toString();
    return s ? `?${s}` : '';
  };

  const handleNavigation = (pathTemplate: string) => {
    performance.mark?.('program_nav_click');
    const resolvedPath = pathTemplate.replace(':id', entityId);
    navigate({ pathname: resolvedPath, search: buildNextSearch() });
  };

  const isActive = (pathTemplate: string) => {
    const resolvedPath = pathTemplate.replace(':id', entityId);
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  const settingsPath = workspaceType === 'program' ? '/admin/portfolios' : '/admin/programs';

  return (
    <aside
      className={cn(
        'h-full flex-shrink-0 relative flex flex-col',
        'transition-all duration-200 ease-in-out',
        className
      )}
        style={{
          // Unified with SidebarBase (240/56) on 2026-04-19 — collapsed was
          // previously 64px here, 56px in SidebarBase; layout jitter when
          // switching workspaces. 56px matches Jira and fits the 28px badge
          // with 14px padding either side.
          width: expanded ? '240px' : '56px',
          // Canonical chrome token — resolves to #F8FAFC (light) / #22272B (dark, ADS surface).
          // Was `var(--surface-1)` raw (invalid CSS — HSL triple without hsl() wrapper),
          // which broke the elevation hierarchy on /for-you and program/project shells
          // (sidebar over-elevated, header collapsed into canvas). 2026-04-30 fix.
          background: 'var(--cp-bg-sidebar-hdr)',
          borderRight: '1px solid var(--cp-bd)',
        }}
      >
        {/* V10 Header with collapse toggle */}
        <div 
          className={cn(
            "border-b flex-shrink-0",
            expanded
              ? "flex items-center justify-between"
              : "flex flex-col items-center justify-center"
          )}
          style={{ 
            minHeight: '54px',
            borderColor: 'var(--divider)',
            padding: expanded ? '14px 14px 14px 16px' : '14px 0',
            gap: expanded ? undefined : '4px',
            background: 'transparent',
          }}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* V10: Circular badge — 28×28 */}
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--cp-blue)',
                color: 'var(--bg-app)',
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {entity?.name?.substring(0, 2).toUpperCase() || entityLabel.substring(0, 2).toUpperCase()}
            </div>
            {expanded && (
              <span 
                className="truncate"
                style={{ 
                  fontFamily: 'var(--cp-font-heading)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: 'var(--text-1, #0f172a)',
                  letterSpacing: '-0.02em',
                }}
              >
                {entity?.name || entityLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center justify-center w-[26px] h-[26px] rounded-md transition-all flex-shrink-0"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-4)';
            }}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? (
              <ChevronsLeft size={15} />
            ) : (
              <ChevronsRight size={15} />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '8px' }}>
          {/* Section header - Views */}
          {expanded && (
            <div className="px-3 pt-2 pb-1">
              <span 
                className="text-xs font-medium tracking-wide"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Views
              </span>
            </div>
          )}
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.pathTemplate);
            const resolvedPath = item.pathTemplate.replace(':id', entityId);
            const starred = isFavorite(resolvedPath);

            const menuButton = (
              <button
                type="button"
                key={item.id}
                onClick={() => handleNavigation(item.pathTemplate)}
                className="group"
                style={{
                  width: '100%',
                  // V10: 36px item height (10px vertical padding)
                  height: '50px',
                  padding: expanded ? '0 12px' : '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px', // V10: 12px icon-to-label gap
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease, color 0.12s ease',
                  marginBottom: '2px',
                  position: 'relative',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  background: active ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                  color: active ? 'var(--cp-blue)' : 'var(--text-2)',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.84rem',
                  fontFamily: 'var(--cp-font-body)',
                  outline: 'none',
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => { 
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)';
                    e.currentTarget.style.color = 'var(--text-1)';
                  }
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.background = active ? 'rgba(37, 99, 235, 0.12)' : 'transparent';
                  e.currentTarget.style.color = active ? 'var(--cp-blue)' : 'var(--text-2)';
                }}
              >
                {/* V10: Left indicator bar for active state - 3px */}
                {active && expanded && (
                  <span 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '7px',
                      bottom: '7px',
                      width: '3px',
                      background: 'var(--cp-blue)',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                {/* V10: Icon - 17×17 */}
                <Icon 
                  style={{ 
                    width: '17px', 
                    height: '17px', 
                    flexShrink: 0, 
                    color: active ? 'var(--cp-blue)' : 'var(--text-3)',
                    strokeWidth: 1.4,
                  }} 
                />
                {expanded && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {/* Star button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(resolvedPath);
                      }}
                      className={cn(
                        "w-5 h-5 flex items-center justify-center rounded transition-opacity",
                        starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      style={{ color: starred ? '#f59e0b' : 'var(--text-4)' }}
                      onMouseEnter={(e) => {
                        if (!starred) {
                          e.currentTarget.style.color = '#f59e0b';
                          e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!starred) {
                          e.currentTarget.style.color = 'var(--text-4)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <Star size={14} fill={starred ? "currentColor" : "none"} />
                    </button>
                    {item.badge && (
                      <span style={{ 
                        padding: '2px 6px', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        background: 'hsl(var(--brand-primary))', 
                        color: 'var(--bg-app)',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );

            if (!expanded) {
              return (
                <Tooltip key={item.id} content={item.label} position="right">
                  {menuButton}
                </Tooltip>
              );
            }

            return menuButton;
          })}
        </nav>

        {/* Footer - Settings */}
        <div 
          className="border-t pt-2 mt-2"
          style={{ borderColor: 'var(--divider)', padding: '8px' }}
        >
          {expanded ? (
            <button 
              type="button"
              className="group"
              style={{
                width: '100%',
                height: '44px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: 'hsl(var(--foreground))',
                fontSize: '13px',
                fontWeight: 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => navigate(settingsPath)}
            >
              <Settings style={{ width: '18px', height: '18px', color: 'hsl(var(--foreground) / 0.7)', strokeWidth: 1.75 }} />
              <span className="text-left">{entityLabel} Settings</span>
            </button>
          ) : (
            <Tooltip content={`${entityLabel} Settings`} position="right">
              <button
                type="button"
                style={{
                  width: '100%',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: 'hsl(var(--foreground))',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                onClick={() => navigate(settingsPath)}
              >
                <Settings style={{ width: '18px', height: '18px', color: 'hsl(var(--foreground) / 0.7)', strokeWidth: 1.75 }} />
              </button>
            </Tooltip>
          )}
        </div>
      </aside>
  );
}
