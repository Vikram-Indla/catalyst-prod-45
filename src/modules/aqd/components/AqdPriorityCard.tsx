// Aqd¹⁰ Priority Card Component - Enterprise UI
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, User, Pencil, Trash2, Check, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AqdItem, AqdItemStatus } from '@/types/aqd';
import { STATUS_CONFIG, AQD_LABEL_COLORS } from '@/types/aqd';

interface AqdPriorityCardProps {
  item: AqdItem;
  onStatusCycle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmCarryover?: () => void;
  onDismissCarryover?: () => void;
  isDraggable?: boolean;
}

export function AqdPriorityCard({
  item,
  onStatusCycle,
  onEdit,
  onDelete,
  onConfirmCarryover,
  onDismissCarryover,
  isDraggable = true,
}: AqdPriorityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    disabled: !isDraggable || item.is_carryover,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isTop10 = item.rank <= 10;
  const isCarryover = item.is_carryover && !item.carryover_confirmed;

  // Has any meta data to show
  const hasMeta = item.taskhub_key || item.assignee_name || item.due_date || item.labels.length > 0;

  const StatusIcon = () => {
    if (item.status === 'not_started') {
      return (
        <div 
          className="w-[26px] h-[26px] rounded-full border-2 border-gray-300 hover:border-amber-400 transition-all hover:scale-110" 
          style={{ background: 'transparent' }}
        />
      );
    }
    if (item.status === 'in_progress') {
      return (
        <div 
          className="w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: '#f59e0b' }}
        >
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      );
    }
    return (
      <div 
        className="w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ background: '#10b981' }}
      >
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-background border rounded-xl flex items-stretch transition-all duration-150",
        isDragging ? "opacity-50 shadow-lg scale-[0.98]" : "shadow-sm",
        "hover:shadow-md hover:border-gray-300 hover:-translate-y-[2px]",
        isCarryover && "border-dashed border-amber-400 bg-amber-50/50",
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "w-9 flex items-center justify-center cursor-grab active:cursor-grabbing border-r border-border/50",
          !isDraggable || item.is_carryover ? "cursor-default opacity-30" : ""
        )}
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {/* Rank Badge */}
      <div className="w-14 flex items-center justify-center border-r border-border/50">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
            isCarryover ? "bg-amber-500 text-white" :
            isTop10 ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          )}
        >
          {item.rank}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 py-3 px-4 min-w-0">
        {/* Title Row */}
        <div
          className={cn(
            "font-medium text-sm leading-snug",
            item.status === 'completed' && "line-through text-gray-400"
          )}
        >
          {item.title}
        </div>
        
        {/* Meta Row - Show if any meta exists */}
        {(hasMeta || isCarryover) && (
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
            {item.taskhub_key && (
              <span className="flex items-center gap-1 font-mono text-primary">
                <Tag className="h-3 w-3" />
                {item.taskhub_key}
              </span>
            )}
            {item.assignee_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {item.assignee_name}
              </span>
            )}
            {item.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(item.due_date), 'MMM d')}
              </span>
            )}
            {item.labels.map(label => (
              <span
                key={label.id}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-sm"
                style={{
                  color: AQD_LABEL_COLORS[label.color]?.text || '#6b7280',
                  border: `1.5px solid ${AQD_LABEL_COLORS[label.color]?.border || '#6b7280'}`,
                  background: 'transparent',
                }}
              >
                {label.name}
              </span>
            ))}
            {isCarryover && (
              <span 
                className="text-[10px] font-semibold px-2 py-0.5 rounded-sm"
                style={{ color: '#d97706', border: '1.5px solid #f59e0b', background: 'transparent' }}
              >
                From Last Week
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions - Hover only for regular items */}
      <div className="flex items-center gap-1 px-3 border-l border-border/50">
        {isCarryover ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={onConfirmCarryover}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={onDismissCarryover}
            >
              Dismiss
            </Button>
          </>
        ) : (
          <>
            {/* Edit/Delete - visible on hover only */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-400 hover:text-gray-600"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {/* Status Toggle - always visible */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onStatusCycle}
                  className="ml-1 transition-transform"
                >
                  <StatusIcon />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="bg-gray-900 text-white text-[11px] px-2 py-1"
              >
                {STATUS_CONFIG[item.status].label}
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}
