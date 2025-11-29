import { Epic } from '@/types/backlog.types';
import { StatusDot } from './StatusDot';
import { LabelPill } from './LabelPill';
import { DragHandle } from './DragHandle';
import { Check, ChevronRight } from 'lucide-react';

interface EpicRowProps {
  epic: Epic;
  isSelected: boolean;
  isExpanded: boolean;
  visibleColumns: string[];
  labelDisplayMode: "full" | "abbreviated" | "hidden";
  onEpicClick: (epicId: string) => void;
  onToggleExpand: (epicId: string) => void;
  onDragStart: (e: React.DragEvent, epic: Epic) => void;
  onDragOver: (e: React.DragEvent, epicId: string) => void;
  onDrop: (e: React.DragEvent, epicId: string) => void;
  onContextMenu: (e: React.MouseEvent, epic: Epic) => void;
}

export function EpicRow({ 
  epic,
  isSelected,
  isExpanded,
  visibleColumns,
  labelDisplayMode,
  onEpicClick,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenu
}: EpicRowProps) {
  const shouldShowLabels = labelDisplayMode !== "hidden";
  const shouldAbbreviate = labelDisplayMode === "abbreviated";

  return (
    <div 
      className={`relative group grid grid-cols-[40px_50px_70px_1fr_auto_70px_50px_100px] items-center px-4 py-2 border-b hover:bg-accent transition-colors cursor-pointer ${
        isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "bg-card"
      }`}
      onClick={() => onEpicClick(epic.id)}
      onDragOver={(e) => onDragOver(e, epic.id)}
      onDrop={(e) => onDrop(e, epic.id)}
      onContextMenu={(e) => onContextMenu(e, epic)}
    >
      {/* Drag Handle */}
      <DragHandle onDragStart={(e) => onDragStart(e, epic)} />

      {/* Expand Arrow */}
      <div className="flex items-center justify-center">
        {epic.hasChildren && (
          <button 
            className={`w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(epic.id);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Rank Number */}
      <div className="text-sm text-muted-foreground text-center">
        {epic.rank}
      </div>

      {/* Status Dot */}
      <StatusDot status={epic.status} />

      {/* Epic ID + Checkbox + Title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
          {epic.numericId}
        </span>
        <div className="w-4 h-4 bg-primary rounded flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm text-primary hover:underline truncate">
          {epic.title}
        </span>
      </div>

      {/* Label Pills */}
      {shouldShowLabels && (
        <div className="flex gap-1 flex-wrap justify-end">
          {epic.labels.slice(0, 6).map((label) => (
            <LabelPill 
              key={label.id} 
              label={label} 
              abbreviated={shouldAbbreviate}
            />
          ))}
        </div>
      )}

      {/* Points */}
      {visibleColumns.includes("points") && (
        <div className="text-sm text-foreground text-right">
          {epic.points}
        </div>
      )}

      {/* MVP */}
      {visibleColumns.includes("mvp") && (
        <div className="text-sm text-muted-foreground text-center">
          {epic.mvp ? 'Yes' : 'No'}
        </div>
      )}

      {/* Process Step */}
      {visibleColumns.includes("processStep") && (
        <div className="text-sm text-muted-foreground truncate">
          {epic.processStep}
        </div>
      )}
    </div>
  );
}