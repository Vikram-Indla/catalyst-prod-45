/**
 * Incident Kanban Column - Optimized for performance
 * Uses virtualization for large card counts
 * Special handling for Committee column governance metrics
 * Enhanced with WIP limits and breach indicators
 * DARK MODE COMPLIANT per Design System V2
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
          "rounded-xl cursor-pointer transition-colors hover:opacity-90",
          // Dark mode compliant backgrounds
          "bg-[#f8f8f7] dark:bg-[var(--ds-surface-raised, #1a1a1a)]",
          "border border-[#e8e8e8] dark:border-[#333]"
        )}
        onClick={handleToggle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Collapsed Header */}
        <div 
          className={cn(
            "flex flex-col items-center gap-1.5 px-1.5 py-2.5 rounded-t-xl",
            "border-b border-[#f0f0f0] dark:border-[#333]"
          )}
        >
          <ChevronRight className="h-3.5 w-3.5 text-[#737373] dark:text-[#a3a3a3]" />
        </div>
        
        {/* Vertical Label + Stats */}
        <div className="flex-1 flex flex-col items-center justify-start py-3 gap-2">
          <span 
            className={cn(
              "text-[11px] font-medium",
              "text-[#404040] dark:text-[#d4d4d4]"
            )}
            style={{ 
              writingMode: 'vertical-rl', 
              textOrientation: 'mixed',
            }}
          >
            {config.label}
          </span>
          <span 
            className={cn(
              "text-[11px] font-medium",
              isOverWip ? "text-[var(--ds-text-warning, #d97706)]" : "text-[#737373] dark:text-[#a3a3a3]"
            )}
          >
            {stats.total}
          </span>
          {stats.breached > 0 && (
            <div className="h-2 w-2 rounded-full animate-pulse bg-[var(--ds-text-danger, #ef4444)]" />
          )}
        </div>
      </div>
    );
  }

  // Expanded view with virtualized cards
  return (
    <div
      className={cn(
        "flex flex-col w-[320px] flex-shrink-0 rounded-xl min-h-[500px]",
        // Dark mode compliant backgrounds
        "bg-[#f8f8f7] dark:bg-[var(--ds-surface-raised, #1a1a1a)]",
        "border border-[#e8e8e8] dark:border-[#333]"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div 
        className={cn(
          "px-4 py-3.5 rounded-t-xl",
          "border-b border-[#f0f0f0] dark:border-[#333]"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <button 
            onClick={handleToggle}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <ChevronDown className={cn(
              "h-3.5 w-3.5 transition-transform text-[#737373] dark:text-[#a3a3a3]",
              isCollapsed && "-rotate-90"
            )} />
            <span className="text-xs font-bold uppercase tracking-wide text-[#404040] dark:text-[#fafafa]">
              {config.label}
            </span>
          </button>
          
          {/* Count with WIP indicator */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              isOverWip ? "text-[var(--ds-text-warning, #d97706)]" : "text-[#737373] dark:text-[#a3a3a3]"
            )}>
              {stats.total}{wipLimit !== undefined && `/${wipLimit}`}
            </span>
            {isOverWip && (
              <AlertCircle className="h-4 w-4 text-[var(--ds-text-warning, #d97706)]" />
            )}
          </div>
        </div>
        
        {/* Secondary metrics */}
        <div className="flex items-center gap-3 text-xs">
          {/* Committee column: Due Soon metric */}
          {status === 'to_committee' && dueSoonCount > 0 && (
            <span className="flex items-center gap-1 text-[#737373] dark:text-[#a3a3a3]">
              <Clock className="h-3 w-3 text-[#0d9488] dark:text-[#14b8a6]" />
              Due Soon: <span className="font-medium text-[var(--ds-surface, #0a0a0a)] dark:text-[#fafafa]">{dueSoonCount}</span>
            </span>
          )}
          
          {/* At Risk count */}
          {status !== 'to_committee' && stats.atRisk > 0 && (
            <span className="text-[#737373] dark:text-[#a3a3a3]">
              At Risk: <span className="font-medium text-[var(--ds-text-warning, #d97706)]">{stats.atRisk}</span>
            </span>
          )}
          
          {/* Breached count - prominent with pulse */}
          {stats.breached > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full animate-pulse bg-[var(--ds-text-danger, #ef4444)]" />
              <span className="text-xs font-semibold text-[var(--ds-text-danger, #ef4444)] dark:text-[#f87171]">
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
