/**
 * Defects Board View - Kanban-style board for defects
 * CATALYST V5 NEUTRAL AUTHORITY: All neutral grayscale, no expressive colors
 * Uses @hello-pangea/dnd for drag-and-drop
 */

import React, { useMemo, useCallback } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  type DropResult 
} from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DefectWithRelations, DefectWorkflowStatus, DefectSeverity } from '../../types/defects';
import { Flame, AlertTriangle, Info, Minus, Link2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SEVERITY_TOKENS, type SemanticSeverity } from '@/lib/semantic-tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DefectsBoardViewProps {
  defects: DefectWithRelations[];
  isLoading?: boolean;
  onDefectClick?: (defect: DefectWithRelations) => void;
  onStatusChange?: (defectId: string, newStatus: DefectWorkflowStatus) => void;
}

interface BoardColumn {
  id: DefectWorkflowStatus;
  label: string;
  /** Neutral text class - no expressive colors */
  textClass: string;
  /** Neutral header bg - elevation based, no color */
  headerBg: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Configuration - NEUTRAL AUTHORITY
// No expressive colors - status expressed by text labels and position
// ─────────────────────────────────────────────────────────────────────────────

const BOARD_COLUMNS: BoardColumn[] = [
  { 
    id: 'new', 
    label: 'New', 
    textClass: 'text-[var(--fg-1)] font-semibold',
    headerBg: 'bg-[var(--bg-3)]'
  },
  { 
    id: 'open', 
    label: 'Open', 
    textClass: 'text-[var(--fg-2)]',
    headerBg: 'bg-[var(--bg-3)]'
  },
  { 
    id: 'in_progress', 
    label: 'In Progress', 
    textClass: 'text-[var(--fg-2)]',
    headerBg: 'bg-[var(--bg-3)]'
  },
  { 
    id: 'in_review', 
    label: 'In Review', 
    textClass: 'text-[var(--fg-2)]',
    headerBg: 'bg-[var(--bg-3)]'
  },
  { 
    id: 'resolved', 
    label: 'Resolved', 
    textClass: 'text-[var(--fg-3)]',
    headerBg: 'bg-[var(--bg-2)]'
  },
  { 
    id: 'closed', 
    label: 'Closed', 
    textClass: 'text-[var(--fg-4)]',
    headerBg: 'bg-[var(--bg-2)]'
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DefectsBoardView({
  defects,
  isLoading,
  onDefectClick,
  onStatusChange,
}: DefectsBoardViewProps) {
  // Group defects by status
  const columnData = useMemo(() => {
    const grouped: Record<string, DefectWithRelations[]> = {};
    
    // Initialize empty arrays for each column
    BOARD_COLUMNS.forEach(col => {
      grouped[col.id] = [];
    });
    
    // Group defects
    defects.forEach(defect => {
      const status = defect.workflow_status || 'open';
      if (grouped[status]) {
        grouped[status].push(defect);
      } else {
        // If status doesn't match any column, put in 'open'
        grouped['open'].push(defect);
      }
    });
    
    return grouped;
  }, [defects]);

  // Handle drag end
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // Dropped outside a valid area
    if (!destination) return;
    
    // Dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    
    // Status changed - call the handler
    if (destination.droppableId !== source.droppableId && onStatusChange) {
      onStatusChange(draggableId, destination.droppableId as DefectWorkflowStatus);
    }
  }, [onStatusChange]);

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full p-4 overflow-x-auto">
        {BOARD_COLUMNS.map(column => (
          <div
            key={column.id}
            className="flex-shrink-0 w-[280px] bg-[var(--bg-2)] rounded-lg animate-pulse"
          >
            <div className="p-3 border-b border-[var(--divider)]">
              <div className="h-5 bg-[var(--bg-3)] rounded w-24" />
            </div>
            <div className="p-3 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-[var(--bg-3)] rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {BOARD_COLUMNS.map(column => (
          <BoardColumnComponent
            key={column.id}
            column={column}
            defects={columnData[column.id] || []}
            onDefectClick={onDefectClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board Defect Card Component - NEUTRAL AUTHORITY
// Icons inherit currentColor, no expressive fills
// ─────────────────────────────────────────────────────────────────────────────

interface BoardDefectCardProps {
  defect: DefectWithRelations;
  onClick?: () => void;
  isDragging?: boolean;
}

const SEVERITY_ICONS: Record<DefectSeverity, React.ElementType> = {
  blocker: Flame,
  critical: Flame,
  major: AlertTriangle,
  minor: Info,
  trivial: Minus,
};

function BoardDefectCard({ defect, onClick, isDragging }: BoardDefectCardProps) {
  const severity = defect.severity as SemanticSeverity;
  const severityConfig = SEVERITY_TOKENS[severity] || SEVERITY_TOKENS.trivial;
  const SeverityIcon = SEVERITY_ICONS[defect.severity] || Minus;

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      className={cn(
        "bg-[var(--bg-card)] border border-[var(--divider)] rounded-lg p-3 cursor-pointer transition-all border-l-4",
        severityConfig.railClass,
        isDragging 
          ? "shadow-lg ring-2 ring-[var(--gold-fg)]/20 rotate-2" 
          : "hover:shadow-md hover:border-[var(--fg-4)]"
      )}
      onClick={onClick}
    >
      {/* Key & Severity */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-[var(--fg-2)]">{defect.defect_key}</span>
        <Badge className={cn('text-[10px] gap-0.5 px-1.5 py-0 border', severityConfig.chipClass)}>
          <SeverityIcon className="h-2.5 w-2.5" />
          {severityConfig.label}
        </Badge>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-[var(--fg-1)] line-clamp-2 mb-2">{defect.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {defect.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={defect.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-[9px] bg-[var(--bg-3)] text-[var(--fg-3)]">
                {getInitials(defect.assignee.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-[var(--fg-3)] truncate max-w-[80px]">
              {defect.assignee.full_name?.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[var(--fg-4)] italic">Unassigned</span>
        )}

        {defect.test_run_id && (
          <Link2 className="h-3.5 w-3.5 text-[var(--fg-4)]" />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board Column Component - NEUTRAL AUTHORITY
// Elevation-based separation, no color fills
// ─────────────────────────────────────────────────────────────────────────────

interface BoardColumnProps {
  column: BoardColumn;
  defects: DefectWithRelations[];
  onDefectClick?: (defect: DefectWithRelations) => void;
}

function BoardColumnComponent({ column, defects, onDefectClick }: BoardColumnProps) {
  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col bg-[var(--bg-1)] rounded-lg border border-[var(--divider)]">
      {/* Column Header - Neutral elevation, no color */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-t-lg border-b border-[var(--divider)]",
        column.headerBg
      )}>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", column.textClass)}>
            {column.label}
          </span>
          <Badge 
            variant="secondary" 
            className="h-5 px-1.5 text-[10px] font-medium bg-[var(--bg-4)] text-[var(--fg-3)] border-0"
          >
            {defects.length}
          </Badge>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "p-2 space-y-2 min-h-[200px] transition-colors",
                snapshot.isDraggingOver && "bg-[var(--row-hover)]"
              )}
            >
              {defects.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-[var(--fg-4)] text-xs">
                  No defects
                </div>
              ) : (
                defects.map((defect, index) => (
                  <Draggable
                    key={defect.id}
                    draggableId={defect.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <BoardDefectCard
                          defect={defect}
                          onClick={() => onDefectClick?.(defect)}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}

export default DefectsBoardView;
