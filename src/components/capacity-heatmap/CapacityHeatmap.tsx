/**
 * Main Capacity Heatmap Component - Enhanced version
 * Assembles all heatmap components into a production-ready view
 * Catalyst V5 compliant - matches reference design
 */

import { memo, useRef, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useCapacityHeatmapData } from '@/hooks/use-capacity-heatmap-data';
import { HeatmapSummaryDashboard } from './HeatmapSummaryDashboard';
import { EnhancedHeatmapGrid } from './EnhancedHeatmapGrid';
import { EnhancedHeatmapLegend } from './EnhancedHeatmapLegend';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { HeatmapEmptyState } from './HeatmapEmptyState';
import { HeatmapErrorState } from './HeatmapErrorState';
import { CellDetailPanel } from './CellDetailPanel';
import { HeatmapContextMenu } from './HeatmapContextMenu';
import type { HeatmapResource } from '@/types/capacity-heatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportToPDF, exportToCSV } from '@/lib/capacity-heatmap/export';

interface CapacityHeatmapProps {
  className?: string;
  departmentFilter?: string;
}

export const CapacityHeatmap = memo(function CapacityHeatmap({
  className,
  departmentFilter
}: CapacityHeatmapProps) {
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
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
  
  // Get year from first month
  const year = useMemo(() => {
    if (!data?.months || data.months.length === 0) return new Date().getFullYear();
    return data.months[0].getFullYear();
  }, [data?.months]);
  
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
      
      // Department filter from props (from parent page)
      if (departmentFilter && departmentFilter !== 'all') {
        const deptLower = r.department?.toLowerCase() || '';
        if (!deptLower.includes(departmentFilter.toLowerCase())) {
          return false;
        }
      }
      
      // Department filter from store
      if (filters.departments.length > 0 && !filters.departments.includes(r.department)) {
        return false;
      }
      
      // Conflicts filter
      if (filters.showOnlyConflicts && !r.hasConflicts) {
        return false;
      }
      
      return true;
    });
  }, [data?.resources, searchQuery, filters, departmentFilter]);
  
  // Handle export to PDF
  const handleExportPDF = useCallback(async () => {
    if (!heatmapRef.current) return;
    
    setIsExporting(true);
    try {
      await exportToPDF(heatmapRef.current, `capacity-heatmap-${year}`);
      toast.success('Heatmap exported to PDF');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  }, [year]);
  
  // Handle export to CSV
  const handleExportCSV = useCallback(() => {
    if (!data) return;
    exportToCSV(filteredResources, data.months, `capacity-heatmap-${year}`);
    toast.success('Heatmap exported to CSV');
  }, [filteredResources, data, year]);
  
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
  
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4 p-6", className)}>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
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
    <div ref={heatmapRef} className={cn("space-y-4", className)}>
      {/* Summary Dashboard */}
      <HeatmapSummaryDashboard
        stats={data.stats}
        resources={filteredResources}
        year={year}
      />
      
      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1.5" />
            )}
            Refresh
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1.5" />
          )}
          Export PDF
        </Button>
      </div>
      
      {/* Enhanced Heatmap Grid */}
      <EnhancedHeatmapGrid
        resources={filteredResources}
        months={data.months}
        year={year}
      />
      
      {/* Legend */}
      <EnhancedHeatmapLegend />
      
      {/* Keyboard shortcuts panel */}
      <KeyboardShortcutsPanel />
      
      {/* Cell Detail Panel */}
      <AnimatePresence>
        {selectedCell && selectedResource && selectedUtilization && (
          <CellDetailPanel
            resource={selectedResource}
            utilization={selectedUtilization}
            scenarioMode={scenarioMode}
            onClose={() => setSelectedCell(null)}
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

export default CapacityHeatmap;
