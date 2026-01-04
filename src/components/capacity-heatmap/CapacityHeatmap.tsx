/**
 * Main Capacity Heatmap Component
 * Assembles all heatmap components into a production-ready view
 * Catalyst V5 compliant
 */

import { memo, useRef, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useCapacityHeatmapData } from '@/hooks/use-capacity-heatmap-data';
import { HeatmapLegend } from './HeatmapLegend';
import { HeatmapCell } from './HeatmapCell';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { HeatmapEmptyState } from './HeatmapEmptyState';
import { HeatmapErrorState } from './HeatmapErrorState';
import { CellDetailPanel } from './CellDetailPanel';
import { HeatmapContextMenu } from './HeatmapContextMenu';
import type { HeatmapResource, Conflict } from '@/types/capacity-heatmap';
import { formatMonth } from '@/lib/capacity-heatmap/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface CapacityHeatmapProps {
  className?: string;
}

export const CapacityHeatmap = memo(function CapacityHeatmap({
  className
}: CapacityHeatmapProps) {
  const heatmapRef = useRef<HTMLDivElement>(null);
  
  // Detail panel state
  const [selectedCell, setSelectedCell] = useState<{
    resourceId: string;
    month: Date;
  } | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    resourceId: string;
    month: Date;
  } | null>(null);
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  // Fetch data with refetch capability
  const { data, isLoading, error, refetch, isRefetching } = useCapacityHeatmapData(12);
  
  const { 
    searchQuery, 
    filters,
    selectCell,
    selectedCells,
    openDetailPanel,
    scenarioMode,
    ghostAllocations,
  } = useHeatmapStore();
  
  // Filter resources
  const filteredResources = useMemo(() => {
    if (!data?.resources) return [];
    
    return data.resources.filter(r => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!r.name.toLowerCase().includes(query) && 
            !r.role.toLowerCase().includes(query) &&
            !r.department.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Department filter
      if (filters.departments.length > 0 && !filters.departments.includes(r.department)) {
        return false;
      }
      
      // Conflicts filter
      if (filters.showOnlyConflicts && !r.hasConflicts) {
        return false;
      }
      
      return true;
    });
  }, [data?.resources, searchQuery, filters]);
  
  // Group by department
  const groupedResources = useMemo(() => {
    const groups: Record<string, HeatmapResource[]> = {};
    
    filteredResources.forEach(r => {
      const dept = r.department || 'Unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r);
    });
    
    return groups;
  }, [filteredResources]);
  
  // Get unique departments
  const departments = useMemo(() => {
    if (!data?.resources) return [];
    return [...new Set(data.resources.map(r => r.department))].sort();
  }, [data?.resources]);
  
  // Handle cell click - opens detail panel
  const handleCellClick = useCallback((resourceId: string, month: Date, e: React.MouseEvent) => {
    selectCell(resourceId, month, e.ctrlKey || e.metaKey);
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedCell({ resourceId, month });
      openDetailPanel(resourceId, month);
    }
  }, [selectCell, openDetailPanel]);
  
  // Handle detail panel close
  const handlePanelClose = useCallback(() => {
    setSelectedCell(null);
  }, []);
  
  // Handle context menu
  const handleCellContextMenu = useCallback((
    e: React.MouseEvent,
    resourceId: string,
    month: Date
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, resourceId, month });
  }, []);
  
  // Handle context menu actions
  const handleContextMenuAction = useCallback((action: string) => {
    if (!contextMenu) return;
    
    const resource = filteredResources.find(r => r.id === contextMenu.resourceId);
    
    switch (action) {
      case 'resolve-conflict':
        toast.info(`Opening conflict resolution for ${resource?.name}`);
        setSelectedCell({ resourceId: contextMenu.resourceId, month: contextMenu.month });
        break;
      case 'view-breakdown':
      case 'edit-allocation':
        setSelectedCell({ resourceId: contextMenu.resourceId, month: contextMenu.month });
        break;
      case 'find-replacement':
        toast.info('Find replacement feature coming soon');
        break;
      case 'adjust-timeline':
        toast.info('Adjust timeline feature coming soon');
        break;
      case 'send-message':
        toast.info(`Message ${resource?.name}`);
        break;
      case 'open-profile':
        toast.info(`Open profile for ${resource?.name}`);
        break;
    }
    
    setContextMenu(null);
  }, [contextMenu, filteredResources]);
  
  
  // Get selected resource and utilization for detail panel
  const selectedResource = selectedCell 
    ? filteredResources.find(r => r.id === selectedCell.resourceId) 
    : null;
  
  const selectedUtilization = selectedResource && selectedCell
    ? selectedResource.monthlyUtilization.find(u => 
        u.month.getFullYear() === selectedCell.month.getFullYear() &&
        u.month.getMonth() === selectedCell.month.getMonth()
      )
    : null;
  
  // Get context menu resource and utilization
  const contextMenuResource = contextMenu 
    ? filteredResources.find(r => r.id === contextMenu.resourceId) 
    : null;
  
  const contextMenuUtilization = contextMenuResource && contextMenu
    ? contextMenuResource.monthlyUtilization.find(u => 
        u.month.getFullYear() === contextMenu.month.getFullYear() &&
        u.month.getMonth() === contextMenu.month.getMonth()
      )
    : null;
  // Get ghost allocation for a cell
  const getGhostPercentage = useCallback((resourceId: string, month: Date) => {
    if (!scenarioMode) return undefined;
    const ghost = ghostAllocations.find(g => 
      g.resourceId === resourceId && 
      g.month.getTime() === month.getTime()
    );
    return ghost?.percentage;
  }, [scenarioMode, ghostAllocations]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4 p-6", className)}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  // Error state with retry
  if (error || !data) {
    return (
      <div className={cn("rounded-lg border border-border bg-card", className)}>
        <HeatmapErrorState
          error={error}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      </div>
    );
  }
  
  // No resources - show empty state with CTAs
  if (data.resources.length === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-card", className)}>
        <HeatmapEmptyState
          onAddResource={() => {
            toast.info('Add resource feature coming soon');
          }}
          onImportData={() => {
            toast.info('Import data feature coming soon');
          }}
        />
      </div>
    );
  }
  return (
    <div className={cn("space-y-4", className)}>
      {/* Legend */}
      <HeatmapLegend />
      
      {/* Heatmap Grid */}
      <div 
        ref={heatmapRef}
        className="overflow-x-auto rounded-lg border border-border bg-card"
      >
        <div className="min-w-max">
          {/* Header row with months */}
          <div className="flex items-center border-b border-border bg-muted/30 sticky top-0 z-10">
            <div className="w-56 flex-shrink-0 px-4 py-3 font-medium text-sm text-muted-foreground">
              Resource
            </div>
            {data.months.map((month, i) => (
              <div
                key={i}
                className="w-10 flex-shrink-0 text-center py-3 text-xs font-medium text-muted-foreground"
              >
                {formatMonth(month)}
              </div>
            ))}
            <div className="w-16 flex-shrink-0 text-center py-3 text-xs font-medium text-muted-foreground">
              Avg
            </div>
          </div>
          
          {/* Grouped rows */}
          {Object.entries(groupedResources).map(([dept, resources]) => (
            <DepartmentGroup
              key={dept}
              department={dept}
              resources={resources}
              months={data.months}
              selectedCells={selectedCells}
              onCellClick={handleCellClick}
              onCellContextMenu={handleCellContextMenu}
              getGhostPercentage={getGhostPercentage}
            />
          ))}
          
          {/* Empty filtered state */}
          {filteredResources.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No resources match your filters
            </div>
          )}
        </div>
      </div>
      
      {/* Keyboard shortcuts panel */}
      <KeyboardShortcutsPanel />
      
      {/* Cell Detail Panel */}
      <AnimatePresence>
        {selectedCell && selectedResource && selectedUtilization && (
          <CellDetailPanel
            resource={selectedResource}
            utilization={selectedUtilization}
            scenarioMode={scenarioMode}
            onClose={handlePanelClose}
            onResolveConflict={() => {
              toast.info('Conflict resolution feature coming soon');
            }}
            onAddAllocation={(percentage, projectName) => {
              toast.info(`Adding ${percentage}% allocation to ${projectName}`);
            }}
            onEditAllocation={(id) => {
              toast.info(`Editing allocation ${id}`);
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && contextMenuResource && contextMenuUtilization && (
          <HeatmapContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            resource={contextMenuResource}
            utilization={contextMenuUtilization}
            onClose={() => setContextMenu(null)}
            onAction={handleContextMenuAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

// Department group component
interface DepartmentGroupProps {
  department: string;
  resources: HeatmapResource[];
  months: Date[];
  selectedCells: { resourceId: string; month: Date }[];
  onCellClick: (resourceId: string, month: Date, e: React.MouseEvent) => void;
  onCellContextMenu: (e: React.MouseEvent, resourceId: string, month: Date) => void;
  getGhostPercentage: (resourceId: string, month: Date) => number | undefined;
}

const DepartmentGroup = memo(function DepartmentGroup({
  department,
  resources,
  months,
  selectedCells,
  onCellClick,
  onCellContextMenu,
  getGhostPercentage,
}: DepartmentGroupProps) {
  const { expandedGroups, toggleGroupExpanded } = useHeatmapStore();
  const isCollapsed = expandedGroups.has('__all_collapsed__') || expandedGroups.has(department);
  
  return (
    <div className="border-b border-border last:border-b-0">
      {/* Group header */}
      <motion.button
        className="w-full flex items-center px-4 py-2 bg-muted/20 hover:bg-muted/40 transition-colors"
        onClick={() => toggleGroupExpanded(department)}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 mr-2 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 mr-2 text-muted-foreground" />
        )}
        <span className="font-medium text-sm">{department}</span>
        <span className="ml-2 text-xs text-muted-foreground">({resources.length})</span>
      </motion.button>
      
      {/* Resources */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {resources.map((resource) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              months={months}
              selectedCells={selectedCells}
              onCellClick={onCellClick}
              onCellContextMenu={onCellContextMenu}
              getGhostPercentage={getGhostPercentage}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
});

// Resource row component
interface ResourceRowProps {
  resource: HeatmapResource;
  months: Date[];
  selectedCells: { resourceId: string; month: Date }[];
  onCellClick: (resourceId: string, month: Date, e: React.MouseEvent) => void;
  onCellContextMenu: (e: React.MouseEvent, resourceId: string, month: Date) => void;
  getGhostPercentage: (resourceId: string, month: Date) => number | undefined;
}

const ResourceRow = memo(function ResourceRow({
  resource,
  months,
  selectedCells,
  onCellClick,
  onCellContextMenu,
  getGhostPercentage,
}: ResourceRowProps) {
  // Get ring color based on contract status
  const getRingStyle = () => {
    if (!resource.contractStatus) return 'ring-primary/30';
    
    const ringStyles = {
      healthy: 'ring-[#0d9488]', // Teal
      warning: 'ring-[#ca8a04]', // Gold
      critical: 'ring-[#be123c] animate-pulse', // Rose with pulse
      expired: 'ring-muted-foreground/40',
      permanent: 'ring-muted-foreground/30'
    };
    
    return ringStyles[resource.contractStatus.status] || 'ring-primary/30';
  };

  return (
    <div className="flex items-center hover:bg-muted/20 transition-colors">
      {/* Resource info with contract ring */}
      <div className="w-56 flex-shrink-0 px-4 py-2 flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary ring-2",
          getRingStyle()
        )}>
          {resource.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{resource.name}</span>
            {/* Location flag */}
            {resource.countryFlagUrl && (
              <img 
                src={resource.countryFlagUrl} 
                alt={resource.country || ''} 
                className="w-4 h-3 object-cover rounded-sm flex-shrink-0"
                title={resource.country || ''}
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{resource.role}</span>
            {/* Contract days indicator */}
            {resource.contractStatus && resource.contractStatus.status !== 'permanent' && (
              <span className={cn(
                "text-[10px] px-1 py-0.5 rounded font-medium flex-shrink-0",
                resource.contractStatus.status === 'critical' && 'bg-red-100 text-[#be123c]',
                resource.contractStatus.status === 'warning' && 'bg-amber-100 text-[#ca8a04]',
                resource.contractStatus.status === 'healthy' && 'bg-teal-100 text-[#0d9488]'
              )}>
                {resource.contractStatus.label}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Cells */}
      <div className="flex items-center gap-0.5">
        {resource.monthlyUtilization.map((util, i) => {
          const isSelected = selectedCells.some(
            c => c.resourceId === resource.id && c.month.getTime() === util.month.getTime()
          );
          
          return (
            <HeatmapCell
              key={i}
              resourceId={resource.id}
              resourceName={resource.name}
              utilization={util}
              isSelected={isSelected}
              ghostPercentage={getGhostPercentage(resource.id, util.month)}
              onClick={(e) => onCellClick(resource.id, util.month, e)}
              onContextMenu={(e) => onCellContextMenu(e, resource.id, util.month)}
            />
          );
        })}
      </div>
      
      {/* Average */}
      <div className="w-16 flex-shrink-0 text-center text-sm font-medium">
        {resource.averageUtilization}%
      </div>
    </div>
  );
});

export default CapacityHeatmap;
