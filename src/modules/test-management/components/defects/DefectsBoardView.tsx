/**
 * Defects Board View - Kanban-style board for defects
 * Uses @hello-pangea/dnd for drag-and-drop
 * Uses Catalyst V5 semantic tokens - NO hardcoded colors
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
  colorClass: string;
  headerBg: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Configuration
// ─────────────────────────────────────────────────────────────────────────────

const BOARD_COLUMNS: BoardColumn[] = [
  { 
    id: 'new', 
    label: 'New', 
    colorClass: 'text-[var(--danger-fg)]',
    headerBg: 'bg-[var(--danger-bg)]'
  },
  { 
    id: 'open', 
    label: 'Open', 
    colorClass: 'text-[var(--warning-fg)]',
    headerBg: 'bg-[var(--warning-bg)]'
  },
  { 
    id: 'in_progress', 
    label: 'In Progress', 
    colorClass: 'text-[var(--info-fg)]',
    headerBg: 'bg-[var(--info-bg)]'
  },
  { 
    id: 'in_review', 
    label: 'In Review', 
    colorClass: 'text-primary',
    headerBg: 'bg-primary/10'
  },
  { 
    id: 'resolved', 
    label: 'Resolved', 
    colorClass: 'text-[var(--success-fg)]',
    headerBg: 'bg-[var(--success-bg)]'
  },
  { 
    id: 'closed', 
    label: 'Closed', 
    colorClass: 'text-muted-foreground',
    headerBg: 'bg-muted/50'
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
            className="flex-shrink-0 w-[280px] bg-muted/30 rounded-lg animate-pulse"
          >
            <div className="p-3 border-b">
              <div className="h-5 bg-muted rounded w-24" />
            </div>
            <div className="p-3 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded" />
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
// Board Defect Card Component (inline for type compatibility)
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
        "bg-card border rounded-lg p-3 cursor-pointer transition-all border-l-4",
        severityConfig.railClass,
        isDragging 
          ? "shadow-lg ring-2 ring-primary/20 rotate-2" 
          : "hover:shadow-md hover:border-primary/30"
      )}
      onClick={onClick}
    >
      {/* Key & Severity */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-primary">{defect.defect_key}</span>
        <Badge className={cn('text-[10px] gap-0.5 px-1.5 py-0 border', severityConfig.chipClass)}>
          <SeverityIcon className="h-2.5 w-2.5" />
          {severityConfig.label}
        </Badge>
      </div>

      {/* Title */}
      <p className="text-sm font-medium line-clamp-2 mb-2">{defect.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {defect.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={defect.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-[9px]">
                {getInitials(defect.assignee.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {defect.assignee.full_name?.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Unassigned</span>
        )}

        {defect.test_run_id && (
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board Column Component
// ─────────────────────────────────────────────────────────────────────────────

interface BoardColumnProps {
  column: BoardColumn;
  defects: DefectWithRelations[];
  onDefectClick?: (defect: DefectWithRelations) => void;
}

function BoardColumnComponent({ column, defects, onDefectClick }: BoardColumnProps) {
  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col bg-muted/20 rounded-lg border border-border/50">
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-t-lg border-b",
        column.headerBg
      )}>
        <div className="flex items-center gap-2">
          <span className={cn("font-medium text-sm", column.colorClass)}>
            {column.label}
          </span>
          <Badge 
            variant="secondary" 
            className="h-5 px-1.5 text-[10px] font-medium"
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
                snapshot.isDraggingOver && "bg-primary/5"
              )}
            >
              {defects.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">
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
