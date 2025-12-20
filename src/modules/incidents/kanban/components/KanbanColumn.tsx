/**
 * Incident Kanban Column - Displays incidents in a single status column
 */

import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
import { STATUS_CONFIG, getColumnStats } from '../types';
import type { Incident, IncidentStatus } from '@/types/incident';

interface KanbanColumnProps {
  status: IncidentStatus;
  incidents: Incident[];
  onDrop: (incidentId: string, newStatus: IncidentStatus) => void;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, incident: Incident) => void;
  onDragEnd: () => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  incidents,
  onDrop,
  draggingId,
  onDragStart,
  onDragEnd,
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

  return (
    <div
      className={cn(
        "flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0",
        "bg-muted/20 rounded-lg border border-border"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40 rounded-t-lg">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: config.color }}
        />
        <span className="text-sm font-semibold text-foreground flex-1 truncate">
          {config.label}
        </span>
        
        {/* Stats */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">
            {stats.total}
          </span>
          {stats.atRisk > 0 && (
            <span className="text-[10px] font-medium text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 px-1 py-0.5 rounded">
              {stats.atRisk} risk
            </span>
          )}
          {stats.breached > 0 && (
            <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1 py-0.5 rounded">
              {stats.breached} breach
            </span>
          )}
        </div>
      </div>

      {/* Card List */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-320px)]">
        <div className="p-2 space-y-2">
          {incidents.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground/60">
              No incidents
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
});

export default KanbanColumn;
