/**
 * Program Sidebar
 * Sidebar for Program-level context (per spec: no Tests, no More items)
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
  Map,
  Target,
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

interface ProgramSidebarProps {
  programId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedQuarter?: string | null;
  onQuarterChange?: (quarter: string | null) => void;
  className?: string;
}

// Program sidebar menu items (per spec - no Tests, no More items)
// Note: label uses workspaceType to conditionally show "Program Room" or "Project Room"
const getMenuItems = (workspaceLabel: string) => [
  { id: 'program-room', label: `${workspaceLabel} Room`, icon: LayoutDashboard, path: '/program/:programId/room' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/program/:programId/work-tree' },
  { id: 'dependencies', label: 'Dependencies', icon: GitBranch, path: '/program/:programId/dependencies' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/program/:programId/roadmaps' },
  { id: 'objectives-tree', label: 'Objectives Tree', icon: Target, path: '/program/:programId/objectives-tree' },
  { id: 'forecast', label: 'Forecast', icon: Grid3x3, path: '/program/:programId/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/program/:programId/capacity', badge: 'NEW' },
  { id: 'quarters', label: 'Quarters', icon: Calendar, path: '/program/:programId/quarters' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/program/:programId/reports' },
];

// Get current quarter based on current date
function getCurrentQuarter(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

export function ProgramSidebar({ 
  programId, 
  expanded, 
  onToggle,
  selectedQuarter,
  onQuarterChange,
  className
}: ProgramSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get workspace label from context - always "Program" for this sidebar
  const workspaceLabel = 'Program';
  const menuItems = getMenuItems(workspaceLabel);

  // Fetch program details
  const { data: program } = useQuery({
    queryKey: ['program-sidebar', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .eq('id', programId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
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
  
  // Default to current quarter if not selected
  const currentQuarter = getCurrentQuarter();
  const effectiveQuarter = selectedQuarter || currentQuarter;

  const handleNavigation = (path: string) => {
    const resolvedPath = path.replace(':programId', programId);
    navigate(resolvedPath + (effectiveQuarter ? `?quarter=${effectiveQuarter}` : ''));
    // Collapse sidebar after navigation
    if (expanded) {
      onToggle();
    }
  };

  const isActive = (path: string) => {
    const resolvedPath = path.replace(':programId', programId);
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  return (
    <aside 
      className={cn(
        "h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col",
        expanded ? "w-[280px]" : "w-16",
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
        {/* Program Context Header */}
        <div className={cn("px-4 pt-4 pb-3 border-b", !expanded && "px-2")}>
          {expanded && (
            <>
              {/* Program Display */}
              <div className="py-2 px-3 mb-3 bg-accent/30 border border-border/50 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded bg-brand-gold flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {program?.name?.substring(0, 2).toUpperCase() || 'PG'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {program?.name || 'Program'}
                    </div>
                    <div className="text-xs text-muted-foreground">Program</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                  QUARTER
                </label>
                <Select 
                  value={effectiveQuarter || undefined} 
                  onValueChange={onQuarterChange}
                  defaultValue={currentQuarter}
                >
                  <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                    <SelectValue placeholder={currentQuarter} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[100]">
                    {quarters?.length ? quarters.map((q) => (
                      <SelectItem key={q.id} value={q.name || q.id}>{q.name}</SelectItem>
                    )) : (
                      <>
                        <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                        <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                        <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                        <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
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
              onClick={() => navigate('/admin/portfolios')}
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Program Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
