/**
 * Unified Sidebar Component
 * Single sidebar component for Program and Project workspaces
 * Replaces ProgramSidebar and ProjectSidebar with shared structure
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard,
  Network,
  GitBranch,
  Map,
  Grid3x3,
  Users as UsersIcon,
  Calendar,
  FileText,
  Settings,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    { id: 'epic-backlog', label: 'Epic Backlog', icon: Square, pathTemplate: '/program/:id/epic-backlog' },
    { id: 'work-tree', label: 'Work tree', icon: Network, pathTemplate: '/program/:id/work-tree' },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch, pathTemplate: '/program/:id/dependencies' },
    { id: 'roadmaps', label: 'Roadmaps', icon: Map, pathTemplate: '/program/:id/roadmaps' },
    { id: 'epic-balancing', label: 'Epic Balancing', icon: Grid3x3, pathTemplate: '/program/:id/epic-balancing' },
    { id: 'reports', label: 'Reports', icon: FileText, pathTemplate: '/program/:id/reports' },
  ],
  project: [
    { id: 'backlog', label: 'Backlog', icon: Square, pathTemplate: '/programs/:id/backlog' },
    { id: 'roadmap', label: 'Roadmap', icon: Map, pathTemplate: '/programs/:id/roadmap' },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch, pathTemplate: '/programs/:id/dependencies' },
    { id: 'reports', label: 'Reports', icon: FileText, pathTemplate: '/programs/:id/reports' },
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
  
  const menuItems = menuConfigs[workspaceType];
  const entityLabel = workspaceType === 'program' ? 'Program' : 'Project';
  const tableName = workspaceType === 'program' ? 'programs' : 'programs';

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

  const handleNavigation = (pathTemplate: string) => {
    const resolvedPath = pathTemplate.replace(':id', entityId);
    navigate(resolvedPath + (effectiveQuarter ? `?quarter=${effectiveQuarter}` : ''));
    if (expanded) {
      onToggle();
    }
  };

  const isActive = (pathTemplate: string) => {
    const resolvedPath = pathTemplate.replace(':id', entityId);
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  const settingsPath = workspaceType === 'program' ? '/admin/portfolios' : '/admin/programs';

  return (
    <aside 
      style={{
        width: expanded ? '220px' : '60px',
        height: '100%',
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border-color)',
        transition: 'all 0.3s ease',
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      className={className}
    >
      {/* Toggle Handle */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '24px',
          zIndex: 50,
          width: '24px',
          height: '24px',
          borderRadius: '9999px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--icon-default)',
        }}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <ChevronLeft style={{ width: '16px', height: '16px' }} />
        ) : (
          <ChevronRight style={{ width: '16px', height: '16px' }} />
        )}
      </button>

      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Sidebar Header - 52px per reference */}
        <div 
          style={{ 
            height: '52px', 
            padding: expanded ? '0 12px' : '0',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: expanded ? 'flex-start' : 'center',
            flexShrink: 0,
          }}
        >
          {expanded ? (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #5c7c5c 0%, #6d8d6d 100%)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {entity?.name?.substring(0, 2).toUpperCase() || entityLabel.substring(0, 2).toUpperCase()}
                </div>
                {/* Section label - always green when expanded */}
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(var(--secondary-green))' }}>
                  {entity?.name || entityLabel}
                </span>
              </div>
              {/* Mini divider - only visible when expanded */}
              <div 
                style={{
                  marginTop: '8px',
                  width: '100%',
                  height: '1px',
                  backgroundColor: 'var(--border-color)',
                }}
              />
            </div>
          ) : (
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #5c7c5c 0%, #6d8d6d 100%)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {entity?.name?.substring(0, 2).toUpperCase() || entityLabel.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.pathTemplate);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.pathTemplate)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: expanded ? '0 12px' : '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '2px',
                  position: 'relative',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  // Active state styling - olive green
                  background: active ? 'var(--accent-muted)' : 'transparent',
                  color: active ? 'hsl(var(--secondary-green))' : 'var(--text-2)',
                  fontWeight: active ? 600 : 500,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { 
                  if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.background = active ? 'var(--accent-muted)' : 'transparent'; 
                }}
                title={!expanded ? item.label : undefined}
              >
                {/* Olive left bar indicator for active state */}
                {active && (
                  <span 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '8px',
                      bottom: '8px',
                      width: '3px',
                      background: 'hsl(var(--secondary-green))',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <Icon style={{ width: '20px', height: '20px', flexShrink: 0, color: active ? 'hsl(var(--secondary-green))' : 'var(--icon-default)' }} />
                {expanded && (
                  <>
                    <span style={{ textAlign: 'left', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.badge && (
                      <span style={{ 
                        padding: '2px 6px', 
                        fontSize: '10px', 
                        fontWeight: 600, 
                        background: 'hsl(var(--secondary-green))', 
                        color: 'var(--text-inverse)',
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
          })}
        </nav>

        {/* Footer */}
        {expanded && (
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '12px 8px' }}>
            <button 
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-2)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => {
                navigate(settingsPath);
                onToggle();
              }}
            >
              <Settings style={{ width: '20px', height: '20px', color: 'var(--icon-default)' }} />
              <span style={{ textAlign: 'left' }}>{entityLabel} Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
