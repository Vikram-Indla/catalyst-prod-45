/**
 * Incident Kanban Swimlane - Collapsible lane for grouped incidents
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
import { 
  KANBAN_STATUSES, 
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

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Swimlane Header - Sticky */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border",
          "hover:bg-muted/50 transition-colors sticky top-0 z-10 text-left"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        {group.color && (
          <span 
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.color }}
          />
        )}
        <span className="text-sm font-semibold text-foreground">{group.label}</span>
        <span className="text-xs text-muted-foreground">
          ({group.incidents.length} incident{group.incidents.length !== 1 ? 's' : ''})
        </span>
      </button>

      {/* Swimlane Content */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <div className="flex gap-3 p-3 min-w-max">
            {visibleStatuses.map(status => {
              const incidents = incidentsByStatus[status];
              const config = STATUS_CONFIG[status];
              const stats = getColumnStats(incidents);

              return (
                <div
                  key={status}
                  className={cn(
                    "flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0",
                    "bg-muted/10 rounded-lg border border-border/50"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(status)}
                >
                  {/* Mini Column Header */}
                  <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-xs font-medium text-muted-foreground flex-1">
                      {config.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {stats.total}
                    </span>
                    {stats.breached > 0 && (
                      <span className="text-[9px] text-destructive">
                        +{stats.breached}!
                      </span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="p-1.5 space-y-1.5 max-h-[300px] overflow-y-auto">
                    {incidents.length === 0 ? (
                      <div className="py-4 text-center text-[10px] text-muted-foreground/50">
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
