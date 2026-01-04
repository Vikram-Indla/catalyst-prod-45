/**
 * Cell Detail Panel - Slide-in panel showing allocation breakdown
 * Catalyst V5 compliant
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Calendar, Briefcase, Plus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { HeatmapResource, MonthlyUtilization, GhostAllocation } from '@/types/capacity-heatmap';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import { formatMonth } from '@/lib/capacity-heatmap/utils';

interface CellDetailPanelProps {
  resource: HeatmapResource;
  utilization: MonthlyUtilization;
  ghostAllocation?: GhostAllocation;
  scenarioMode: boolean;
  onClose: () => void;
  onResolveConflict?: () => void;
  onAddAllocation?: (percentage: number, projectName: string) => void;
  onEditAllocation?: (allocationId: string) => void;
}

export const CellDetailPanel = memo(function CellDetailPanel({
  resource,
  utilization,
  ghostAllocation,
  scenarioMode,
  onClose,
  onResolveConflict,
  onAddAllocation,
  onEditAllocation,
}: CellDetailPanelProps) {
  const { percentage, allocations, isConflict, month } = utilization;

  return (
    <motion.div
      className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <h3 className="font-semibold text-foreground">
              Allocation Details
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatMonth(month, 'long')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Resource Info */}
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: `${CATALYST_COLORS.primary}15`, color: CATALYST_COLORS.primary }}
          >
            {resource.initials}
          </div>
          <div>
            <div className="font-medium text-foreground">
              {resource.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {resource.role} • {resource.team || resource.department}
            </div>
          </div>
        </div>

        {/* Utilization Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Utilization
            </span>
            <span 
              className="text-lg font-bold"
              style={{ color: isConflict ? CATALYST_COLORS.danger : percentage > 85 ? CATALYST_COLORS.warning : CATALYST_COLORS.teal }}
            >
              {percentage}%
            </span>
          </div>

          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-2"
          />
          
          {isConflict && (
            <div 
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-md"
              style={{ backgroundColor: `${CATALYST_COLORS.danger}10`, color: CATALYST_COLORS.danger }}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>
                Over-allocated by {percentage - 100}%
              </span>
            </div>
          )}
        </div>

        {/* Conflict Resolution */}
        {isConflict && onResolveConflict && (
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={onResolveConflict}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Resolve Conflict
          </Button>
        )}

        {/* Ghost Allocation Indicator */}
        {scenarioMode && ghostAllocation && (
          <div 
            className="flex items-center justify-between text-sm py-2 px-3 rounded-md border-2 border-dashed"
            style={{ 
              borderColor: CATALYST_COLORS.warning,
              backgroundColor: `${CATALYST_COLORS.warning}10`
            }}
          >
            <span style={{ color: CATALYST_COLORS.warning }}>What-If Scenario</span>
            <span className="font-semibold" style={{ color: CATALYST_COLORS.warning }}>
              +{ghostAllocation.percentage}%
            </span>
          </div>
        )}

        {/* Allocations Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Briefcase className="w-4 h-4" />
            Allocations ({allocations.length})
          </div>
          
          {allocations.length > 0 ? (
            <div className="space-y-2">
              {allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => onEditAllocation?.(alloc.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: alloc.projectColor }}
                      />
                      <span className="text-sm font-medium">
                        {alloc.projectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {alloc.percentage}%
                      </span>
                      <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(alloc.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' → '}
                    {new Date(alloc.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Briefcase className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No allocations</p>
              <p className="text-xs text-muted-foreground">This resource is fully available</p>
            </div>
          )}

          {/* Add Allocation Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onAddAllocation?.(20, 'New Project')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Allocation
          </Button>
        </div>
      </div>
    </motion.div>
  );
});
