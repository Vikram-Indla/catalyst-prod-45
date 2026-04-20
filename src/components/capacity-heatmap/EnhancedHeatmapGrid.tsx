/**
 * Enhanced Heatmap Grid - Quarterly layout with contract badges and locked cells
 * Catalyst V5 compliant - matches reference design
 */

import { memo, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ArrowDownAZ, SortAsc, Clock, TrendingUp, TrendingDown, AlertTriangle, Calendar, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ads';
import type { HeatmapResource, MonthlyUtilization } from '@/types/capacity-heatmap';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import { formatMonth } from '@/lib/capacity-heatmap/utils';
import { getUtilizationColor } from '@/lib/capacity-heatmap/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';

interface EnhancedHeatmapGridProps {
  resources: HeatmapResource[];
  months: Date[];
  year: number;
  className?: string;
}

type SortBy = 'name' | 'utilization' | 'contract';

export const EnhancedHeatmapGrid = memo(function EnhancedHeatmapGrid({
  resources,
  months,
  year,
  className
}: EnhancedHeatmapGridProps) {
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const { viewMode, selectCell, selectedCells, openDetailPanel, setHoveredCell } = useHeatmapStore();
  
  // Group months into quarters
  const quarters = useMemo(() => {
    const q: { label: string; months: Date[] }[] = [
      { label: 'Q1', months: [] },
      { label: 'Q2', months: [] },
      { label: 'Q3', months: [] },
      { label: 'Q4', months: [] },
    ];
    
    months.forEach(m => {
      const monthNum = m.getMonth();
      if (monthNum < 3) q[0].months.push(m);
      else if (monthNum < 6) q[1].months.push(m);
      else if (monthNum < 9) q[2].months.push(m);
      else q[3].months.push(m);
    });
    
    return q.filter(quarter => quarter.months.length > 0);
  }, [months]);
  
  // Sort resources
  const sortedResources = useMemo(() => {
    const sorted = [...resources];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'utilization':
        return sorted.sort((a, b) => b.averageUtilization - a.averageUtilization);
      case 'contract':
        return sorted.sort((a, b) => {
          const aDays = a.contractStatus?.daysRemaining;
          const bDays = b.contractStatus?.daysRemaining;
          if (aDays === null || aDays === undefined) return 1;
          if (bDays === null || bDays === undefined) return -1;
          return aDays - bDays;
        });
      default:
        return sorted;
    }
  }, [resources, sortBy]);
  
  // Handle cell click
  const handleCellClick = useCallback((resourceId: string, month: Date, e: React.MouseEvent) => {
    selectCell(resourceId, month, e.ctrlKey || e.metaKey);
    if (!e.ctrlKey && !e.metaKey) {
      openDetailPanel(resourceId, month);
    }
  }, [selectCell, openDetailPanel]);
  
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <div className="min-w-max">
          {/* Header - Sticky */}
          <div className="flex items-stretch border-b border-border bg-card sticky top-0 z-20 shadow-sm">
            {/* Resource column header */}
            <div className="w-60 flex-shrink-0 px-4 py-3 border-r border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Resource
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSortBy('name')}
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-opacity",
                    sortBy === 'name' ? 'opacity-100' : 'opacity-40'
                  )}
                  title="Sort by Name"
                >
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSortBy('utilization')}
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-opacity",
                    sortBy === 'utilization' ? 'opacity-100' : 'opacity-40'
                  )}
                  title="Sort by Utilization"
                >
                  <SortAsc className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSortBy('contract')}
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-opacity",
                    sortBy === 'contract' ? 'opacity-100' : 'opacity-40'
                  )}
                  title="Sort by Contract"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {/* Quarter headers */}
            {quarters.map((quarter, qIndex) => (
              <div 
                key={quarter.label}
                className={cn(
                  "flex flex-col border-r border-border",
                  qIndex < quarters.length - 1 && "border-r-2"
                )}
              >
                <div className="px-2 py-1 text-center border-b border-border bg-muted/50">
                  <span className="text-xs font-semibold" style={{ color: CATALYST_COLORS.primary }}>
                    {quarter.label} {year}
                  </span>
                </div>
                <div className="flex">
                {quarter.months.map((month) => (
                    <div
                      key={month.getTime()}
                      className="w-[70px] flex-shrink-0 text-center py-2 text-[10px] font-semibold text-muted-foreground uppercase border-r border-border/50 last:border-r-0"
                    >
                      {formatMonth(month)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Notes column header */}
            <div className="w-64 flex-shrink-0 flex items-center justify-start py-2 px-4 bg-muted/50">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</span>
            </div>
          </div>
          
          {/* Resource rows */}
          <div>
            {sortedResources.map((resource) => (
              <EnhancedResourceRow
                key={resource.id}
                resource={resource}
                quarters={quarters}
                onCellClick={handleCellClick}
                selectedCells={selectedCells}
                viewMode={viewMode}
              />
            ))}
          </div>
          
          {/* Empty state */}
          {sortedResources.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No resources match your filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface EnhancedResourceRowProps {
  resource: HeatmapResource;
  quarters: { label: string; months: Date[] }[];
  onCellClick: (resourceId: string, month: Date, e: React.MouseEvent) => void;
  selectedCells: { resourceId: string; month: Date }[];
  viewMode: 'standard' | 'thermal';
}

const EnhancedResourceRow = memo(function EnhancedResourceRow({
  resource,
  quarters,
  onCellClick,
  selectedCells,
  viewMode
}: EnhancedResourceRowProps) {
  // Get ring color based on contract status
  const ringColor = useMemo(() => {
    if (!resource.contractStatus) return 'ring-muted-foreground/30';
    
    const colors: Record<string, string> = {
      healthy: 'ring-[#0d9488]',
      warning: 'ring-[#ca8a04]',
      critical: 'ring-[#be123c] animate-pulse',
      expired: 'ring-muted-foreground/40',
      permanent: 'ring-muted-foreground/30'
    };
    
    return colors[resource.contractStatus.status] || 'ring-muted-foreground/30';
  }, [resource.contractStatus]);
  
  // Find contract end month for badge positioning
  const contractEndMonth = useMemo(() => {
    if (!resource.contractEndDate) return null;
    const endDate = new Date(resource.contractEndDate);
    return { month: endDate.getMonth(), year: endDate.getFullYear() };
  }, [resource.contractEndDate]);
  
  // Format contract end date for badge
  const formatContractBadge = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Get status label
  const getStatusLabel = () => {
    if (resource.contractStatus?.status === 'critical' || resource.contractStatus?.status === 'warning') {
      return { text: 'EXPIRING', color: CATALYST_COLORS.danger };
    }
    if (resource.averageUtilization > 100) {
      return { text: 'OVER', color: CATALYST_COLORS.danger };
    }
    if (resource.averageUtilization < 50) {
      return { text: 'AVAIL', color: CATALYST_COLORS.teal };
    }
    if (resource.trend === 'down') {
      return { text: '↘ freeing', color: CATALYST_COLORS.teal };
    }
    if (resource.trend === 'up') {
      return { text: '↗ filling', color: CATALYST_COLORS.warning };
    }
    return { text: 'stable', color: 'var(--muted-foreground)' };
  };
  
  const statusLabel = getStatusLabel();
  
  return (
    <div className="flex items-stretch hover:bg-muted/20 transition-colors border-b border-border last:border-b-0">
      {/* Resource info */}
      <div className="w-60 flex-shrink-0 px-4 py-3 border-r border-border flex items-center gap-3">
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ring-2 flex-shrink-0 overflow-hidden",
          ringColor
        )} style={{ 
          backgroundColor: resource.avatarUrl ? 'transparent' : `${CATALYST_COLORS.primary}15`,
          color: CATALYST_COLORS.primary
        }}>
          {resource.avatarUrl ? (
            <img src={resource.avatarUrl} alt={resource.initials} className="w-full h-full object-cover" />
          ) : (
            resource.initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{resource.name}</span>
            {resource.countryFlagUrl && (
              <img 
                src={resource.countryFlagUrl} 
                alt={resource.country || ''} 
                className="w-4 h-3 object-cover rounded-sm flex-shrink-0"
                title={resource.country || ''}
              />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate block">{resource.role}</span>
        </div>
      </div>
      
      {/* Cells by quarter */}
      {quarters.map((quarter, qIndex) => {
        return (
          <div 
            key={quarter.label}
            className={cn(
              "relative flex items-center",
              qIndex < quarters.length - 1 && "border-r-2 border-border"
            )}
          >
            {quarter.months.map((month, monthIdx) => {
              const util = resource.monthlyUtilization.find(u => 
                u.month.getMonth() === month.getMonth() && 
                u.month.getFullYear() === month.getFullYear()
              );
              
              if (!util) return <div key={month.getTime()} className="w-[70px] h-16" />;
              
              const isSelected = selectedCells.some(
                c => c.resourceId === resource.id && c.month.getTime() === util.month.getTime()
              );
              
              // Check if contract ends in THIS specific month
              const contractEndsInThisMonth = contractEndMonth && 
                month.getMonth() === contractEndMonth.month && 
                month.getFullYear() === contractEndMonth.year;
              
              return (
                <div key={month.getTime()} className="relative">
                  {/* Contract end badge - subtle teal styling */}
                  {contractEndsInThisMonth && resource.contractEndDate && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                      <div 
                        className="px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 shadow-sm"
                      >
                        <Clock className="w-3 h-3" />
                        {formatContractBadge(resource.contractEndDate)}
                      </div>
                    </div>
                  )}
                  <EnhancedHeatmapCell
                    resourceId={resource.id}
                    resourceName={resource.name}
                    utilization={util}
                    isSelected={isSelected}
                    viewMode={viewMode}
                    onClick={(e) => onCellClick(resource.id, month, e)}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
      
      {/* Insights column */}
      <ResourceInsightsCell resource={resource} />
    </div>
  );
});

interface EnhancedHeatmapCellProps {
  resourceId: string;
  resourceName: string;
  utilization: MonthlyUtilization;
  isSelected: boolean;
  viewMode: 'standard' | 'thermal';
  onClick: (e: React.MouseEvent) => void;
}

const EnhancedHeatmapCell = memo(function EnhancedHeatmapCell({
  resourceId,
  resourceName,
  utilization,
  isSelected,
  viewMode,
  onClick
}: EnhancedHeatmapCellProps) {
  const { setHoveredCell, hoveredCell } = useHeatmapStore();
  const isLocked = utilization.isLocked;
  
  const colors = isLocked 
    ? { bg: 'transparent', text: 'var(--muted-foreground)', pulse: false }
    : getUtilizationColor(utilization.percentage, viewMode);
  
  const isHovered = hoveredCell?.resourceId === resourceId && 
    hoveredCell.month.getTime() === utilization.month.getTime();
  
  // Locked cell styling with hatched pattern
  if (isLocked) {
    return (
      <div 
        className="w-[70px] h-16 flex items-center justify-center border-r border-border/50 last:border-r-0"
        style={{
          background: 'repeating-linear-gradient(45deg, hsl(var(--muted)/0.5), hsl(var(--muted)/0.5) 4px, hsl(var(--muted-foreground)/0.08) 4px, hsl(var(--muted-foreground)/0.08) 8px)',
        }}
      >
        <span className="text-sm text-muted-foreground/60">🔒</span>
      </div>
    );
  }
  
  // Determine cell color based on utilization - Catalyst blue scale
  const isAvailable = utilization.percentage === 0;
  const isFullyAllocated = utilization.percentage >= 80 && utilization.percentage <= 100;
  const isPartiallyAllocated = utilization.percentage > 0 && utilization.percentage < 80;
  const isOverAllocated = utilization.percentage > 100;
  
  // Color scheme matching screenshot - blue for allocated, green for available
  let bgColor = 'hsl(var(--muted)/0.3)';
  let textColor = 'hsl(var(--muted-foreground))';
  
  if (isOverAllocated) {
    bgColor = `${CATALYST_COLORS.danger}25`;
    textColor = CATALYST_COLORS.danger;
  } else if (isFullyAllocated) {
    bgColor = `${CATALYST_COLORS.primary}30`;
    textColor = CATALYST_COLORS.primary;
  } else if (isPartiallyAllocated) {
    bgColor = `${CATALYST_COLORS.primary}20`;
    textColor = CATALYST_COLORS.primary;
  } else if (isAvailable) {
    bgColor = `${CATALYST_COLORS.teal}15`;
    textColor = CATALYST_COLORS.teal;
  }
  
  const cellTooltipContent = (
    <div className="text-sm">
      <div className="px-3 py-2 border-b border-border">
        <div className="font-medium">{resourceName}</div>
        <div className="text-xs text-muted-foreground">
          {formatMonth(utilization.month, 'long')}
        </div>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Utilization</span>
          <span className="font-semibold">{utilization.percentage}%</span>
        </div>
        {utilization.allocations.length > 0 && (
          <div className="pt-1 border-t border-border space-y-1">
            <div className="text-[10px] text-muted-foreground">Allocations:</div>
            {utilization.allocations.slice(0, 3).map((alloc) => (
              <div key={alloc.id} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: alloc.projectColor }}
                />
                <span className="flex-1 truncate">{alloc.projectName}</span>
                <span className="font-medium">{alloc.percentage}%</span>
              </div>
            ))}
            {utilization.allocations.length > 3 && (
              <div className="text-[10px] text-muted-foreground">
                +{utilization.allocations.length - 3} more
              </div>
            )}
          </div>
        )}
        {utilization.isConflict && (
          <div
            className="text-xs px-2 py-1 rounded mt-1"
            style={{ backgroundColor: `${CATALYST_COLORS.danger}15`, color: CATALYST_COLORS.danger }}
          >
            Over-allocated by {utilization.percentage - 100}%
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Tooltip delay={200} content={cellTooltipContent}>
        <motion.div
          className={cn(
            "w-[70px] h-16 flex flex-col items-center justify-center cursor-pointer border-r border-border/30 last:border-r-0 relative transition-all",
            isSelected && "ring-2 ring-primary ring-inset",
            isHovered && "ring-1 ring-primary/50 ring-inset",
          )}
          style={{ backgroundColor: bgColor }}
          onClick={onClick}
          onMouseEnter={() => setHoveredCell({ resourceId, month: utilization.month })}
          onMouseLeave={() => setHoveredCell(null)}
          whileHover={{ scale: 1.02, zIndex: 5 }}
          whileTap={{ scale: 0.98 }}
        >
          <span 
            className="text-sm font-bold tabular-nums"
            style={{ color: textColor }}
          >
            {utilization.percentage}
          </span>
          
          {/* Conflict indicator */}
          {utilization.isConflict && (
            <motion.span
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: CATALYST_COLORS.danger }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          )}
        </motion.div>
    </Tooltip>
  );
});

// Resource Insights Cell - Smart insights about contract, allocation, trends
interface ResourceInsightsCellProps {
  resource: HeatmapResource;
}

const ResourceInsightsCell = memo(function ResourceInsightsCell({ resource }: ResourceInsightsCellProps) {
  // Generate meaningful insights - no averages, proper English, use space well
  const insights = useMemo(() => {
    const items: { text: string; color: string; priority: number }[] = [];
    
    // Contract status - most important
    if (resource.contractStatus?.status === 'critical') {
      const days = resource.contractStatus.daysRemaining;
      items.push({
        text: `Contract expires in ${days} days — action required`,
        color: 'text-rose-600 dark:text-rose-400',
        priority: 1
      });
    } else if (resource.contractStatus?.status === 'warning') {
      const days = resource.contractStatus.daysRemaining;
      items.push({
        text: `Contract renewal due in ${days} days`,
        color: 'text-amber-600 dark:text-amber-400',
        priority: 2
      });
    } else if (resource.contractEndDate) {
      const endDate = new Date(resource.contractEndDate);
      const formatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      items.push({
        text: `Contract valid until ${formatted}`,
        color: 'text-teal-600 dark:text-teal-400',
        priority: 5
      });
    }
    
    // Capacity status
    if (resource.averageUtilization > 100) {
      items.push({
        text: `Currently over-allocated by ${resource.averageUtilization - 100}%`,
        color: 'text-rose-600 dark:text-rose-400',
        priority: 1
      });
    } else if (resource.averageUtilization === 100) {
      items.push({
        text: 'Fully allocated — no capacity available',
        color: 'text-blue-600 dark:text-blue-400',
        priority: 3
      });
    } else if (resource.averageUtilization < 30) {
      items.push({
        text: `Has significant availability for new work`,
        color: 'text-emerald-600 dark:text-emerald-400',
        priority: 3
      });
    } else if (resource.averageUtilization < 70) {
      items.push({
        text: 'Has capacity for additional assignments',
        color: 'text-emerald-600 dark:text-emerald-400',
        priority: 4
      });
    }
    
    // Conflicts
    if (resource.conflictCount > 0) {
      items.push({
        text: `${resource.conflictCount} scheduling conflict${resource.conflictCount > 1 ? 's' : ''} detected`,
        color: 'text-rose-600 dark:text-rose-400',
        priority: 2
      });
    }
    
    // Vendor / team info
    if (resource.vendor) {
      items.push({
        text: `Contractor via ${resource.vendor}`,
        color: 'text-sky-600 dark:text-sky-400',
        priority: 6
      });
    }
    
    // Trend insights
    if (resource.trend === 'up' && resource.trendPercentage > 15) {
      items.push({
        text: 'Workload increasing — monitor capacity',
        color: 'text-amber-600 dark:text-amber-400',
        priority: 4
      });
    } else if (resource.trend === 'down' && resource.trendPercentage > 15) {
      items.push({
        text: 'Workload decreasing — capacity opening up',
        color: 'text-emerald-600 dark:text-emerald-400',
        priority: 4
      });
    }
    
    // Sort by priority and take top 2
    return items.sort((a, b) => a.priority - b.priority).slice(0, 2);
  }, [resource]);

  // Fallback if no insights
  if (insights.length === 0) {
    return (
      <div className="w-64 flex-shrink-0 flex items-center px-4 py-2 bg-muted/5 border-l border-border/30">
        <span className="text-xs text-muted-foreground">No alerts or updates</span>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 flex flex-col justify-center gap-1.5 py-2 px-4 bg-muted/5 border-l border-border/30">
      {insights.map((insight, i) => (
        <p 
          key={i}
          className={cn(
            "text-xs leading-relaxed",
            insight.color
          )}
        >
          {insight.text}
        </p>
      ))}
    </div>
  );
});
