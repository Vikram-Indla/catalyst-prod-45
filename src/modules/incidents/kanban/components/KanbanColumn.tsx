/**
 * Incident Kanban Column - Optimized for performance
 * Uses virtualization for large card counts
 */

import { memo, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualizedCardList } from './VirtualizedCardList';
import { STATUS_CONFIG, getColumnStats } from '../types';
import type { Incident, IncidentStatus } from '@/types/incident';

interface KanbanColumnProps {
  status: IncidentStatus;
  incidents: Incident[];
  onDrop: (incidentId: string, newStatus: IncidentStatus) => void;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, incident: Incident) => void;
  onDragEnd: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (status: IncidentStatus) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  incidents,
  onDrop,
  draggingId,
  onDragStart,
  onDragEnd,
  isCollapsed = false,
  onToggleCollapse,
}: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const stats = getColumnStats(incidents);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const incidentId = e.dataTransfer.getData('text/plain');
    if (incidentId) {
      onDrop(incidentId, status);
    }
  }, [onDrop, status]);

  const handleToggle = useCallback(() => {
    onToggleCollapse?.(status);
  }, [onToggleCollapse, status]);

  // Collapsed view - just header + counts
  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex flex-col min-w-[48px] max-w-[48px] flex-shrink-0",
          "bg-muted/10 rounded-lg border border-border/50 cursor-pointer",
          "hover:bg-muted/20 transition-colors"
        )}
        onClick={handleToggle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Collapsed Header */}
        <div className="flex flex-col items-center gap-1.5 px-1.5 py-2.5 border-b border-border/50 bg-muted/30 rounded-t-lg">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
        
        {/* Vertical Label + Stats */}
        <div className="flex-1 flex flex-col items-center justify-start py-3 gap-2">
          <span 
            className="text-[11px] font-medium text-muted-foreground writing-mode-vertical"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {config.label}
          </span>
          <span className="text-[11px] font-medium text-foreground/80">
            {stats.total}
          </span>
        </div>
      </div>
    );
  }

  // Expanded view with virtualized cards
  return (
    <div
      className={cn(
        "flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0",
        "bg-muted/10 rounded-lg border border-border/50"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header - Executive Clean */}
      <div 
        className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border/50 bg-muted/30 rounded-t-lg cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={handleToggle}
      >
        {/* Collapse chevron - subtle */}
        {onToggleCollapse && (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        )}
        
        {/* Column name + count */}
        <span className="text-sm font-medium text-foreground truncate">
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground font-normal">
          ({stats.total})
        </span>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Secondary micro-metrics - muted, only if > 0 */}
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground/70">
          {stats.atRisk > 0 && (
            <span className="font-normal">
              At Risk: <span className="font-medium text-muted-foreground">{stats.atRisk}</span>
            </span>
          )}
          {stats.breached > 0 && (
            <span className="font-normal">
              Breached: <span className="font-medium text-muted-foreground">{stats.breached}</span>
            </span>
          )}
        </div>
      </div>

      {/* Virtualized Card List */}
      <VirtualizedCardList
        incidents={incidents}
        draggingId={draggingId}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        maxHeight={window.innerHeight - 320}
        emptyMessage="No incidents"
      />
    </div>
  );
});

export default KanbanColumn;
