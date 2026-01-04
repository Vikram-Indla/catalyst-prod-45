/**
 * Defect Board View (Kanban) Component
 */

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DefectCard } from './DefectCard';
import type { Defect, DefectStatus } from '../../api/types';

interface DefectBoardViewProps {
  defects: Defect[];
  onDefectClick: (defect: Defect) => void;
  onStatusChange?: (defectId: string, newStatus: DefectStatus) => void;
}

const COLUMNS: { status: DefectStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'resolved', label: 'Fixed' },
  { status: 'closed', label: 'Verified' },
  // { status: 'closed', label: 'Closed' },
];

export function DefectBoardView({ defects, onDefectClick, onStatusChange }: DefectBoardViewProps) {
  // Group defects by status
  const groupedDefects = COLUMNS.reduce((acc, col) => {
    acc[col.status] = defects.filter(d => {
      // Map our UI columns to actual statuses
      if (col.status === 'resolved') {
        return d.status === 'resolved';
      }
      if (col.status === 'closed') {
        return d.status === 'closed';
      }
      return d.status === col.status;
    });
    return acc;
  }, {} as Record<DefectStatus, Defect[]>);

  const handleDragStart = (e: React.DragEvent, defect: Defect) => {
    e.dataTransfer.setData('defectId', defect.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: DefectStatus) => {
    e.preventDefault();
    const defectId = e.dataTransfer.getData('defectId');
    if (defectId && onStatusChange) {
      onStatusChange(defectId, targetStatus);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-350px)] min-h-[400px]">
      {COLUMNS.map((column) => {
        const columnDefects = groupedDefects[column.status] || [];
        
        return (
          <div
            key={column.status}
            className="flex-1 min-w-[240px] max-w-[300px] flex flex-col bg-muted/30 rounded-lg"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 rounded-t-lg">
              <span className="font-medium text-sm">{column.label}</span>
              <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded-full">
                {columnDefects.length}
              </span>
            </div>

            {/* Column Content */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {columnDefects.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No defects
                  </div>
                ) : (
                  columnDefects.map((defect) => (
                    <div
                      key={defect.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, defect)}
                    >
                      <DefectCard
                        defect={defect}
                        onClick={() => onDefectClick(defect)}
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
