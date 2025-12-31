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
    ? 'border-l-status-warning' 
    : item.status === 'success' 
    ? 'border-l-status-success' 
    : 'border-l-status-danger';

  const tagBg = item.status === 'warning'
    ? 'bg-status-warning/10 text-status-warning'
    : 'bg-status-danger/10 text-status-danger';

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-surface-0 rounded-xl border border-border-subtle border-l-[3px] p-4 cursor-pointer",
        "shadow-sm transition-all duration-200 ease-out",
        "hover:shadow-md hover:-translate-y-0.5",
        borderColor
      )}
    >
      {/* Key */}
      <div className="font-mono text-[13px] font-semibold text-brand-primary mb-1">
        {item.key}
      </div>

      {/* Title */}
      <div className="text-[14px] font-medium text-text-primary mb-2 leading-snug">
        {item.title}
      </div>

      {/* AI Reason */}
      <div className="text-[12px] text-text-tertiary leading-relaxed mb-2.5">
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
        <span className="text-text-muted">
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
          "bg-gradient-to-r from-status-success to-brand-primary",
          "border-0 rounded-lg text-white text-[13px] font-semibold",
          "shadow-[0_2px_8px_rgba(13,148,136,0.3)]",
          "transition-all duration-200 ease-out cursor-pointer",
          "hover:shadow-[0_4px_16px_rgba(13,148,136,0.4)] hover:-translate-y-0.5"
        )}
      >
        <Play className="w-3.5 h-3.5" />
        Start this
      </button>
    </div>
  );
}
