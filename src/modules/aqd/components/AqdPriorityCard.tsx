// Aqd¹⁰ Priority Card Component
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, User, Pencil, Trash2, Check, ArrowRight } from 'lucide-react';
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

  const StatusIcon = () => {
    const config = STATUS_CONFIG[item.status];
    if (item.status === 'not_started') {
      return (
        <div className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-orange-400 transition-colors" />
      );
    }
    if (item.status === 'in_progress') {
      return (
        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
        <Check className="h-3.5 w-3.5 text-white" />
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-background border rounded-xl flex items-stretch transition-all",
        isDragging ? "opacity-50 shadow-lg scale-[0.98]" : "shadow-sm",
        "hover:shadow-md hover:border-border/80 hover:-translate-y-0.5",
        isCarryover && "border-dashed border-orange-400 bg-orange-50/50",
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
            "w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold",
            isCarryover ? "bg-orange-500 text-white" :
            isTop10 ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          )}
        >
          {item.rank}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 py-3 px-4 min-w-0">
        <div
          className={cn(
            "font-medium text-sm",
            item.status === 'completed' && "line-through text-muted-foreground"
          )}
        >
          {item.title}
        </div>
        
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
          {item.taskhub_key && (
            <span className="font-mono text-primary">{item.taskhub_key}</span>
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
            <Badge
              key={label.id}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5"
              style={{
                color: AQD_LABEL_COLORS[label.color]?.text || '#6b7280',
                borderColor: AQD_LABEL_COLORS[label.color]?.border || '#6b7280',
              }}
            >
              {label.name}
            </Badge>
          ))}
          {isCarryover && (
            <Badge variant="outline" className="border-orange-400 text-orange-600 text-[10px] px-1.5 py-0 h-5">
              From Last Week
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onStatusCycle}
                  className="transition-transform hover:scale-110"
                >
                  <StatusIcon />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {STATUS_CONFIG[item.status].label}
              </TooltipContent>
            </Tooltip>
            
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
