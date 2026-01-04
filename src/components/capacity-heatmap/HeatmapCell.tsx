/**
 * Heatmap Cell - Individual cell with rich tooltip
 * Catalyst V5 compliant
 */

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';
import type { MonthlyUtilization, ProjectAllocation } from '@/types/capacity-heatmap';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import { getUtilizationColor, formatMonth, getTrendIcon, isSameMonth } from '@/lib/capacity-heatmap/utils';

interface HeatmapCellProps {
  resourceId: string;
  resourceName: string;
  utilization: MonthlyUtilization;
  isSelected?: boolean;
  isHighlighted?: boolean;
  ghostPercentage?: number;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const HeatmapCell = memo(function HeatmapCell({
  resourceId,
  resourceName,
  utilization,
  isSelected,
  isHighlighted,
  ghostPercentage,
  onClick,
  onContextMenu,
}: HeatmapCellProps) {
  const { viewMode, patternMode, hoveredCell, setHoveredCell, timeLapseMonth, isTimeLapsePlaying } = useHeatmapStore();
  
  // Handle locked months (past contract end date)
  const isLocked = utilization.isLocked;
  
  const colors = isLocked 
    ? { bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))', pulse: false }
    : getUtilizationColor(utilization.percentage, viewMode);
  
  const isHovered = hoveredCell?.resourceId === resourceId && 
    isSameMonth(hoveredCell.month, utilization.month);
  
  const handleMouseEnter = useCallback(() => {
    setHoveredCell({ resourceId, month: utilization.month });
  }, [resourceId, utilization.month, setHoveredCell]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, [setHoveredCell]);
  
  // Time-lapse highlighting
  const isTimeLapseActive = isTimeLapsePlaying && 
    utilization.month.getMonth() === timeLapseMonth;
  
  // Calculate display percentage (with ghost if in scenario mode)
  const displayPercentage = isLocked ? 0 : (ghostPercentage 
    ? utilization.percentage + ghostPercentage 
    : utilization.percentage);
  
  const displayColors = isLocked
    ? colors
    : ghostPercentage 
      ? getUtilizationColor(displayPercentage, viewMode)
      : colors;
  
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <motion.div
          className={cn(
            "relative w-10 h-8 rounded-sm cursor-pointer",
            "flex items-center justify-center",
            "border border-transparent",
            "transition-all duration-150",
            isSelected && "ring-2 ring-primary ring-offset-1",
            isHighlighted && "ring-1 ring-primary/50",
            isHovered && "ring-1 ring-primary/30",
            isTimeLapseActive && "ring-2 ring-yellow-400",
          )}
          style={{
            backgroundColor: displayColors.bg,
            color: displayColors.text,
          }}
          onClick={onClick}
          onContextMenu={onContextMenu}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          whileHover={{ scale: 1.08, zIndex: 10 }}
          whileTap={{ scale: 0.95 }}
          animate={colors.pulse ? {
            boxShadow: [
              `0 0 0 0 ${CATALYST_COLORS.danger}40`,
              `0 0 0 4px ${CATALYST_COLORS.danger}00`,
            ],
          } : {}}
          transition={colors.pulse ? {
            duration: 1,
            repeat: Infinity,
          } : { duration: 0.15 }}
        >
          {/* Locked indicator */}
          {isLocked && (
            <span className="text-[10px] text-muted-foreground">🔒</span>
          )}
          
          {/* Percentage text */}
          {!isLocked && (
            <span className={cn(
              "text-[10px] font-semibold",
              utilization.percentage === 0 && "text-muted-foreground"
            )}>
              {displayPercentage > 0 ? displayPercentage : ''}
            </span>
          )}
          
          {/* Conflict indicator */}
          {utilization.isConflict && !isLocked && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full text-[8px] font-bold flex items-center justify-center"
              style={{ 
                backgroundColor: CATALYST_COLORS.danger,
                color: 'white'
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              !
            </motion.span>
          )}
          
          {/* Ghost allocation indicator */}
          {ghostPercentage && ghostPercentage > 0 && (
            <motion.div
              className="absolute inset-0 rounded-sm pointer-events-none"
              style={{
                border: `2px dashed ${CATALYST_COLORS.warning}`,
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          
          {/* Pattern overlay for accessibility */}
          {patternMode && utilization.percentage > 0 && (
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
              <defs>
                <pattern
                  id={`cell-pattern-${resourceId}-${utilization.month.getTime()}`}
                  patternUnits="userSpaceOnUse"
                  width="4"
                  height="4"
                >
                  {utilization.percentage <= 40 && (
                    <line x1="0" y1="4" x2="4" y2="0" stroke="currentColor" strokeWidth="0.5" />
                  )}
                  {utilization.percentage > 40 && utilization.percentage <= 70 && (
                    <>
                      <line x1="0" y1="4" x2="4" y2="0" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="0" y1="2" x2="2" y2="0" stroke="currentColor" strokeWidth="0.5" />
                    </>
                  )}
                  {utilization.percentage > 70 && utilization.percentage <= 85 && (
                    <>
                      <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="0" y1="0" x2="4" y2="0" stroke="currentColor" strokeWidth="0.5" />
                    </>
                  )}
                  {utilization.percentage > 85 && utilization.percentage <= 100 && (
                    <>
                      <line x1="2" y1="0" x2="2" y2="4" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="0" y1="2" x2="4" y2="2" stroke="currentColor" strokeWidth="0.5" />
                    </>
                  )}
                  {utilization.percentage > 100 && (
                    <>
                      <line x1="0" y1="0" x2="4" y2="4" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="4" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.5" />
                    </>
                  )}
                </pattern>
              </defs>
              <rect 
                width="100%" 
                height="100%" 
                fill={`url(#cell-pattern-${resourceId}-${utilization.month.getTime()})`} 
              />
            </svg>
          )}
        </motion.div>
      </TooltipTrigger>
      
      <TooltipContent 
        side="top" 
        className="w-64 p-0 overflow-hidden"
        sideOffset={8}
      >
        <CellTooltipContent
          resourceName={resourceName}
          utilization={utilization}
          ghostPercentage={ghostPercentage}
        />
      </TooltipContent>
    </Tooltip>
  );
});

// Tooltip content component
interface CellTooltipContentProps {
  resourceName: string;
  utilization: MonthlyUtilization;
  ghostPercentage?: number;
}

function CellTooltipContent({ resourceName, utilization, ghostPercentage }: CellTooltipContentProps) {
  const trend = utilization.previousPeriodPercentage !== undefined
    ? utilization.percentage > utilization.previousPeriodPercentage ? 'up'
      : utilization.percentage < utilization.previousPeriodPercentage ? 'down'
      : 'stable'
    : 'stable';
  
  const trendDiff = utilization.previousPeriodPercentage !== undefined
    ? Math.abs(utilization.percentage - utilization.previousPeriodPercentage)
    : 0;
  
  return (
    <div className="text-sm">
      {/* Header */}
      <div 
        className="px-3 py-2 border-b border-border"
        style={{ 
          backgroundColor: utilization.isConflict ? `${CATALYST_COLORS.danger}10` : undefined 
        }}
      >
        <div className="font-medium text-foreground">{resourceName}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {formatMonth(utilization.month, 'long')}
          {utilization.isConflict && (
            <span 
              className="px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{ 
                backgroundColor: CATALYST_COLORS.danger,
                color: 'white'
              }}
            >
              CONFLICT
            </span>
          )}
        </div>
      </div>
      
      {/* Body */}
      <div className="px-3 py-2 space-y-2">
        {/* Utilization */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Utilization</span>
          <span className="font-semibold flex items-center gap-1">
            {utilization.percentage}%
            {trend !== 'stable' && (
              <span 
                className="text-xs"
                style={{ 
                  color: trend === 'up' ? CATALYST_COLORS.warning : CATALYST_COLORS.teal 
                }}
              >
                {getTrendIcon(trend)} {trendDiff}%
              </span>
            )}
          </span>
        </div>
        
        {/* Ghost allocation indicator */}
        {ghostPercentage && ghostPercentage > 0 && (
          <div 
            className="flex items-center justify-between text-xs py-1 px-2 rounded"
            style={{ backgroundColor: `${CATALYST_COLORS.warning}15` }}
          >
            <span style={{ color: CATALYST_COLORS.warning }}>What-If Scenario</span>
            <span className="font-semibold" style={{ color: CATALYST_COLORS.warning }}>
              +{ghostPercentage}%
            </span>
          </div>
        )}
        
        {/* Allocations breakdown */}
        {utilization.allocations.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1">Allocations:</div>
            {utilization.allocations.map((alloc) => (
              <AllocationRow key={alloc.id} allocation={alloc} />
            ))}
          </div>
        )}
        
        {utilization.allocations.length === 0 && (
          <div className="text-xs text-muted-foreground italic">
            No allocations
          </div>
        )}
      </div>
    </div>
  );
}

function AllocationRow({ allocation }: { allocation: ProjectAllocation }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div 
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: allocation.projectColor }}
      />
      <span className="flex-1 truncate">{allocation.projectName}</span>
      <span className="font-medium">{allocation.percentage}%</span>
    </div>
  );
}
