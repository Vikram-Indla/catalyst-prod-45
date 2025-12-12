/**
 * Project Sidebar
 * Sidebar for Project-level context (per spec: no Tests, no More items, no Epics)
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard,
  Network,
  GitBranch,
  Grid3x3,
  Users as UsersIcon,
  Calendar,
  FileText,
  Settings,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ProjectSidebarProps {
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedQuarter?: string | null;
  onQuarterChange?: (quarter: string | null) => void;
  className?: string;
}

// Project sidebar menu items (per spec - no Tests, no More items, no Epics)
// Uses "Project" label as this is the Project sidebar
const menuItems = [
  { id: 'project-room', label: 'Project Room', icon: LayoutDashboard, path: '/programs/:projectId/room' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/programs/:projectId/work-tree' },
  { id: 'dependencies', label: 'Dependencies', icon: GitBranch, path: '/programs/:projectId/dependencies' },
  { id: 'forecast', label: 'Forecast', icon: Grid3x3, path: '/programs/:projectId/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/programs/:projectId/capacity', badge: 'NEW' },
  { id: 'quarters', label: 'Quarters', icon: Calendar, path: '/programs/:projectId/quarters' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/programs/:projectId/reports' },
];

// Get current quarter based on current date
function getCurrentQuarter(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

export function ProjectSidebar({ 
  projectId, 
  expanded, 
  onToggle,
  selectedQuarter,
  onQuarterChange,
  className
}: ProjectSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Current quarter for default
  const currentQuarter = getCurrentQuarter();
  const effectiveQuarter = selectedQuarter || currentQuarter;

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ['project-sidebar', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select(`
          id, 
          name,
          portfolios (
            id,
            name
          )
        `)
        .eq('id', projectId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch available quarters (PIs)
  const { data: quarters } = useQuery({
    queryKey: ['quarters-sidebar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleNavigation = (path: string) => {
    const resolvedPath = path.replace(':projectId', projectId);
    navigate(resolvedPath + (effectiveQuarter ? `?quarter=${effectiveQuarter}` : ''));
    // Collapse sidebar after navigation
    if (expanded) {
      onToggle();
    }
  };

  const isActive = (path: string) => {
    const resolvedPath = path.replace(':projectId', projectId);
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  return (
    <aside 
      className={cn(
        "h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col",
        expanded ? "w-44" : "w-14",
        className
      )}
    >
      {/* Toggle Handle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-accent transition-transform"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className="h-full flex flex-col overflow-hidden">
        {/* Project Context Header - Compact */}
        <div className={cn("px-2 py-2 border-b", !expanded && "px-1")}>
          {expanded ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-brand-gold flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {project?.name?.substring(0, 2).toUpperCase() || 'PR'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {project?.name || 'Project'}
                </div>
                <div className="text-[10px] text-muted-foreground">Project</div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-md bg-brand-gold flex items-center justify-center text-white text-xs font-semibold">
                {project?.name?.substring(0, 2).toUpperCase() || 'PR'}
              </div>
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
                {expanded && (
                  <>
                    <span className="truncate text-left flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-gold text-white rounded uppercase">
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
          <div className="border-t">
            <button 
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors"
              onClick={() => navigate('/admin/programs')}
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Project Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
