/**
 * Roadmap Bar - Individual objective bar
 */

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { RoadmapObjective, TimelineConfig } from '@/types/roadmap';
import { STATUS_COLORS, LAYOUT } from '@/types/roadmap';
import { calculateBarPosition, getInitials } from '@/lib/roadmap-utils';

interface RoadmapBarProps {
  objective: RoadmapObjective;
  timelineConfig: TimelineConfig;
  isSelected: boolean;
  isEditing: boolean;
  animationDelay: number;
  zoom: number;
  onSelect: () => void;
  onDoubleClick: () => void;
  onFinishEdit: (newName: string) => void;
  onCancelEdit: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

export function RoadmapBar({
  objective,
  timelineConfig,
  isSelected,
  isEditing,
  animationDelay,
  zoom,
  onSelect,
  onDoubleClick,
  onFinishEdit,
  onCancelEdit,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: RoadmapBarProps) {
  const [editValue, setEditValue] = useState(objective.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const { left, width } = calculateBarPosition(
    objective.start,
    objective.end,
    timelineConfig
  );

  const scaledWidth = width * (zoom / 100);
  const isPending = objective.status === 'pending';
  const statusColor = STATUS_COLORS[objective.status];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFinishEdit(editValue);
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "absolute flex items-center gap-1.5 px-2 rounded-md cursor-grab select-none",
        "transition-all duration-150 min-w-[60px]",
        "animate-in fade-in slide-in-from-left-2",
        isPending 
          ? "bg-surface-0 text-text-muted border border-dashed border-border-strong" 
          : "text-white",
        isSelected && "ring-2 ring-brand-primary shadow-lg z-30",
        !isSelected && "hover:-translate-y-0.5 hover:shadow-md hover:z-20"
      )}
      style={{
        left: `${left}%`,
        width: `${scaledWidth}%`,
        height: LAYOUT.barHeight,
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: isPending ? undefined : statusColor,
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Progress overlay */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 rounded-l-md pointer-events-none",
          isPending ? "bg-surface-1" : "bg-black/10"
        )}
        style={{ width: `${objective.prog}%` }}
      />

      {/* Avatar */}
      <div 
        className={cn(
          "w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-semibold shrink-0 z-10",
          isPending ? "bg-surface-1 text-text-muted" : "bg-white/20"
        )}
      >
        {getInitials(objective.owner)}
      </div>

      {/* Title or Edit Input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onFinishEdit(editValue)}
          autoFocus
          className="flex-1 bg-white/95 border-none rounded px-1.5 py-0.5 text-[11px] font-medium text-text-primary outline-none z-20"
        />
      ) : (
        <span className="flex-1 text-[11px] font-medium truncate z-10">
          {objective.name}
        </span>
      )}

      {/* Dependency dot */}
      <div 
        className={cn(
          "w-1.5 h-1.5 rounded-full cursor-crosshair z-10 transition-transform hover:scale-150",
          isPending 
            ? "bg-border border border-text-muted" 
            : "bg-white/30 border border-white/60"
        )}
      />

      {/* Resize handles */}
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize" />
      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize" />
    </div>
  );
}
