/**
 * Incident Kanban Column - Optimized for performance
 * Uses virtualization for large card counts
 * Special handling for Committee column governance metrics
 * Enhanced with WIP limits and breach indicators
 */

import { memo, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Clock, AlertCircle } from 'lucide-react';
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
  onEditCommittee?: (incident: Incident) => void;
  wipLimit?: number;
}

// Helper to count incidents due within 24h
function countDueSoon(incidents: Incident[]): number {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return incidents.filter(inc => {
    const dueDate = inc.committee?.due_date;
    if (!dueDate) return false;
    const due = new Date(dueDate);
    return due > now && due <= in24h;
  }).length;
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
  onEditCommittee,
  wipLimit,
}: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const stats = getColumnStats(incidents);
  
  // Committee-specific: count due soon
  const dueSoonCount = useMemo(() => {
    if (status !== 'to_committee') return 0;
    return countDueSoon(incidents);
  }, [status, incidents]);

  // WIP limit check
  const isOverWip = wipLimit !== undefined && stats.total > wipLimit;

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
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        
        {/* Vertical Label + Stats */}
        <div className="flex-1 flex flex-col items-center justify-start py-3 gap-2">
          <span 
            className="text-[11px] font-medium text-muted-foreground writing-mode-vertical"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {config.label}
          </span>
          <span className={cn(
            "text-[11px] font-medium",
            isOverWip ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          )}>
            {stats.total}
          </span>
          {stats.breached > 0 && (
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  // Expanded view with virtualized cards
  return (
    <div
      className={cn(
        "flex flex-col w-[320px] flex-shrink-0",
        "bg-muted/20 rounded-lg border border-border"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header - Enhanced with WIP limits */}
      <div className="px-3 py-3 border-b border-border bg-muted/30 rounded-t-lg">
        <div className="flex items-center justify-between mb-1">
          <button 
            onClick={handleToggle}
            className="flex items-center gap-2 hover:bg-muted rounded px-1 py-0.5 transition-colors"
          >
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isCollapsed && "-rotate-90"
            )} />
            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">
              {config.label}
            </h3>
          </button>
          
          {/* Count with WIP indicator */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium px-2 py-0.5 rounded",
              isOverWip 
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
                : "text-muted-foreground"
            )}>
              {stats.total}{wipLimit !== undefined && `/${wipLimit}`}
            </span>
            {isOverWip && (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </div>
        
        {/* Secondary metrics */}
        <div className="flex items-center gap-3 text-xs">
          {/* Committee column: Due Soon metric */}
          {status === 'to_committee' && dueSoonCount > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
              Due Soon: <span className="font-medium text-foreground">{dueSoonCount}</span>
            </span>
          )}
          
          {/* At Risk count */}
          {status !== 'to_committee' && stats.atRisk > 0 && (
            <span className="text-muted-foreground">
              At Risk: <span className="font-medium text-amber-600 dark:text-amber-400">{stats.atRisk}</span>
            </span>
          )}
          
          {/* Breached count - prominent with pulse */}
          {stats.breached > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                {stats.breached} breached
              </span>
            </div>
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
        onEditCommittee={status === 'to_committee' ? onEditCommittee : undefined}
      />
    </div>
  );
});

export default KanbanColumn;
