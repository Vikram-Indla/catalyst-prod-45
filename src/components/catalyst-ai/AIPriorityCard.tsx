/**
 * AI Priority Card - Start Here section
 */

import React from 'react';
import { Clock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIPriorityItem } from './CatalystAIPanel';

interface AIPriorityCardProps {
  item: AIPriorityItem;
  onClick: () => void;
  onStartTask: () => void;
}

export function AIPriorityCard({ item, onClick, onStartTask }: AIPriorityCardProps) {
  const borderColor = item.status === 'warning' 
    ? 'border-l-yellow-500' 
    : item.status === 'success' 
    ? 'border-l-emerald-500' 
    : 'border-l-destructive';

  const tagBg = item.status === 'warning'
    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
    : 'bg-destructive/10 text-destructive';

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border border-border border-l-[3px] p-4 cursor-pointer",
        "shadow-sm transition-all duration-200 ease-out",
        "hover:shadow-md hover:-translate-y-0.5",
        borderColor
      )}
    >
      {/* Key */}
      <div className="font-mono text-[13px] font-semibold text-primary mb-1">
        {item.key}
      </div>

      {/* Title */}
      <div className="text-sm font-medium text-foreground mb-2 leading-snug">
        {item.title}
      </div>

      {/* AI Reason */}
      <div className="text-xs text-muted-foreground leading-relaxed mb-2.5">
        {item.aiReason}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold",
          tagBg
        )}>
          <Clock className="w-3 h-3" />
          {item.timeLeft}
        </span>
        <span className="text-muted-foreground">
          Updated {item.updatedAt}
        </span>
      </div>

      {/* Start Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStartTask();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 mt-3.5 px-4 py-2.5",
          "bg-primary",
          "border-0 rounded-lg text-primary-foreground text-[13px] font-semibold",
          "shadow-md",
          "transition-all duration-200 ease-out cursor-pointer",
          "hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5"
        )}
      >
        <Play className="w-3.5 h-3.5" />
        Start this
      </button>
    </div>
  );
}
