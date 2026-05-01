/**
 * Incident Kanban Swimlane - Optimized with virtualization
 * Clean, collapsible lanes with smooth scrolling
 * DARK MODE COMPLIANT per Design System V2
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualizedCardList } from './VirtualizedCardList';
import { 
  STATUS_CONFIG, 
  getColumnStats,
  type SwimlaneGroup 
} from '../types';
import type { Incident, IncidentStatus } from '@/types/incident';

interface KanbanSwimlaneProps {
  group: SwimlaneGroup;
  onDrop: (incidentId: string, newStatus: IncidentStatus) => void;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, incident: Incident) => void;
  onDragEnd: () => void;
  visibleStatuses: IncidentStatus[];
}

export const KanbanSwimlane = memo(function KanbanSwimlane({
  group,
  onDrop,
  draggingId,
  onDragStart,
  onDragEnd,
  visibleStatuses,
}: KanbanSwimlaneProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate lane-level stats
  const laneStats = useMemo(() => getColumnStats(group.incidents), [group.incidents]);

  // Group incidents by status - memoized
  const incidentsByStatus = useMemo(() => {
    const grouped: Record<IncidentStatus, Incident[]> = {} as Record<IncidentStatus, Incident[]>;
    visibleStatuses.forEach(status => {
      grouped[status] = [];
    });
    group.incidents.forEach(incident => {
      if (grouped[incident.status]) {
        grouped[incident.status].push(incident);
      }
    });
    return grouped;
  }, [group.incidents, visibleStatuses]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((status: IncidentStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    const incidentId = e.dataTransfer.getData('text/plain');
    if (incidentId) {
      onDrop(incidentId, status);
    }
  }, [onDrop]);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Skip empty lanes
  if (group.incidents.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border/40 last:border-b-0">
      {/* Swimlane Header - Sticky, clean, READABLE typography */}
      <button
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center gap-2 px-4 sm:px-6 py-2",
          "bg-muted/20 dark:bg-[var(--ds-surface-raised, #1a1a1a)]",
          "hover:bg-muted/30 dark:hover:bg-[#262626]",
          "transition-colors sticky top-0 z-10 text-left"
        )}
      >
        {/* Collapse chevron */}
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-[#737373] dark:text-[#a3a3a3] flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[#737373] dark:text-[#a3a3a3] flex-shrink-0" />
        )}
        
        {/* Lane name - PRIMARY text */}
        <span className="text-sm font-medium text-foreground">{group.label}</span>
        
        {/* Total count - SECONDARY (readable) */}
        <span className="text-xs text-muted-foreground">
          ({group.incidents.length})
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Muted SLA counters - only if > 0 */}
        <div className="flex items-center gap-3 text-[11px] text-[#737373] dark:text-[#a3a3a3]">
          {laneStats.atRisk > 0 && (
            <span>
              At Risk: <span className="font-medium text-[var(--ds-text-warning, #d97706)] dark:text-[#fbbf24]">{laneStats.atRisk}</span>
            </span>
          )}
          {laneStats.breached > 0 && (
            <span>
              Breached: <span className="font-medium text-[var(--ds-text-danger, #ef4444)] dark:text-[#f87171]">{laneStats.breached}</span>
            </span>
          )}
        </div>
      </button>

      {/* Swimlane Content */}
      {isExpanded && (
        <div className="overflow-x-auto px-4 sm:px-6 py-3">
          <div className="flex gap-3 min-w-max">
            {visibleStatuses.map(status => {
              const incidents = incidentsByStatus[status];
              const config = STATUS_CONFIG[status];
              const columnStats = getColumnStats(incidents);

              return (
                <SwimlaneColumn
                  key={status}
                  status={status}
                  config={config}
                  incidents={incidents}
                  columnStats={columnStats}
                  draggingId={draggingId}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(status)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

// Memoized column within swimlane to prevent rerenders
interface SwimlaneColumnProps {
  status: IncidentStatus;
  config: { label: string; color: string };
  incidents: Incident[];
  columnStats: { total: number; atRisk: number; breached: number };
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, incident: Incident) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const SwimlaneColumn = memo(function SwimlaneColumn({
  status,
  config,
  incidents,
  columnStats,
  draggingId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: SwimlaneColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col min-w-[240px] max-w-[260px] flex-shrink-0",
        "bg-muted/10 dark:bg-[var(--ds-surface-raised, #1a1a1a)] rounded",
        "border border-border/30 dark:border-[#333]"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Mini Column Header - READABLE typography */}
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1.5",
        "border-b border-border/30 dark:border-[#333]",
        "bg-muted/20 dark:bg-[#262626]"
      )}>
        <span className="text-xs font-medium text-muted-foreground flex-1 truncate">
          {config.label}
        </span>
        <span className="text-[10px] text-[#737373] dark:text-[#a3a3a3]">
          {columnStats.total}
        </span>
      </div>

      {/* Virtualized Cards */}
      <VirtualizedCardList
        incidents={incidents}
        draggingId={draggingId}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        maxHeight={280}
        emptyMessage="—"
      />
    </div>
  );
});

export default KanbanSwimlane;
