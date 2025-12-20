/**
 * Incident Kanban Swimlane - Clean, collapsible lane for grouped incidents
 * Sticky headers with lane name + counts, no visual clutter
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
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

  // Group incidents by status
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

  // Skip empty lanes
  if (group.incidents.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border/40 last:border-b-0">
      {/* Swimlane Header - Sticky, clean */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-4 sm:px-6 py-2 bg-muted/20",
          "hover:bg-muted/30 transition-colors sticky top-0 z-10 text-left"
        )}
      >
        {/* Collapse chevron - subtle */}
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        )}
        
        {/* Lane name */}
        <span className="text-sm font-medium text-foreground">{group.label}</span>
        
        {/* Total count */}
        <span className="text-xs text-muted-foreground">
          ({group.incidents.length})
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Muted SLA counters - only if > 0 */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
          {laneStats.atRisk > 0 && (
            <span>
              At Risk: <span className="font-medium text-muted-foreground">{laneStats.atRisk}</span>
            </span>
          )}
          {laneStats.breached > 0 && (
            <span>
              Breached: <span className="font-medium text-muted-foreground">{laneStats.breached}</span>
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
                <div
                  key={status}
                  className={cn(
                    "flex flex-col min-w-[240px] max-w-[260px] flex-shrink-0",
                    "bg-muted/10 rounded border border-border/30"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(status)}
                >
                  {/* Mini Column Header */}
                  <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/30 bg-muted/20">
                    <span className="text-xs font-medium text-muted-foreground flex-1 truncate">
                      {config.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {columnStats.total}
                    </span>
                  </div>

                  {/* Cards */}
                  <ScrollArea className="max-h-[280px]">
                    <div className="p-1.5 space-y-1">
                      {incidents.length === 0 ? (
                        <div className="py-6 text-center text-[10px] text-muted-foreground/40">
                          —
                        </div>
                      ) : (
                        incidents.map(incident => (
                          <KanbanCard
                            key={incident.id}
                            incident={incident}
                            isDragging={draggingId === incident.id}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default KanbanSwimlane;
