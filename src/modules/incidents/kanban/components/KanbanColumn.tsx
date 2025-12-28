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
          "rounded-xl cursor-pointer transition-colors hover:opacity-90"
        )}
        style={{
          backgroundColor: '#f8f8f7',
          border: '1px solid #e8e8e8',
        }}
        onClick={handleToggle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Collapsed Header */}
        <div 
          className="flex flex-col items-center gap-1.5 px-1.5 py-2.5 rounded-t-xl"
          style={{ 
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <ChevronRight className="h-3.5 w-3.5" style={{ color: '#737373' }} />
        </div>
        
        {/* Vertical Label + Stats */}
        <div className="flex-1 flex flex-col items-center justify-start py-3 gap-2">
          <span 
            className="text-[11px] font-medium writing-mode-vertical"
            style={{ 
              writingMode: 'vertical-rl', 
              textOrientation: 'mixed',
              color: '#404040',
            }}
          >
            {config.label}
          </span>
          <span 
            className="text-[11px] font-medium"
            style={{ color: isOverWip ? '#d97706' : '#737373' }}
          >
            {stats.total}
          </span>
          {stats.breached > 0 && (
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: '#ef4444' }} />
          )}
        </div>
      </div>
    );
  }

  // Expanded view with virtualized cards
  return (
    <div
      className={cn(
        "flex flex-col w-[320px] flex-shrink-0 rounded-xl min-h-[500px]"
      )}
      style={{
        backgroundColor: '#f8f8f7',
        border: '1px solid #e8e8e8',
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div 
        className="px-4 py-3.5 rounded-t-xl"
        style={{
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <button 
            onClick={handleToggle}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <ChevronDown className={cn(
              "h-3.5 w-3.5 transition-transform",
              isCollapsed && "-rotate-90"
            )} style={{ color: '#737373' }} />
            <span 
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: '#404040' }}
            >
              {config.label}
            </span>
          </button>
          
          {/* Count with WIP indicator */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums" style={{ color: isOverWip ? '#d97706' : '#737373' }}>
              {stats.total}{wipLimit !== undefined && `/${wipLimit}`}
            </span>
            {isOverWip && (
              <AlertCircle className="h-4 w-4" style={{ color: '#d97706' }} />
            )}
          </div>
        </div>
        
        {/* Secondary metrics */}
        <div className="flex items-center gap-3 text-xs">
          {/* Committee column: Due Soon metric */}
          {status === 'to_committee' && dueSoonCount > 0 && (
            <span className="flex items-center gap-1" style={{ color: '#737373' }}>
              <Clock className="h-3 w-3" style={{ color: '#0d9488' }} />
              Due Soon: <span className="font-medium" style={{ color: '#0a0a0a' }}>{dueSoonCount}</span>
            </span>
          )}
          
          {/* At Risk count */}
          {status !== 'to_committee' && stats.atRisk > 0 && (
            <span style={{ color: '#737373' }}>
              At Risk: <span className="font-medium" style={{ color: '#d97706' }}>{stats.atRisk}</span>
            </span>
          )}
          
          {/* Breached count - prominent with pulse */}
          {stats.breached > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
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
