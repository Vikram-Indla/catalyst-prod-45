/**
 * AI Next Item - "Then" section items
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import type { AINextItemData } from './CatalystAIPanel';

interface AINextItemProps {
  item: AINextItemData;
  index: number;
  onClick: () => void;
  onKeyClick?: (key: string, type: string) => void;
}

export function AINextItem({ item, index, onClick, onKeyClick }: AINextItemProps) {
  const handleKeyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onKeyClick?.(item.key, item.type);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 bg-card border border-border rounded-[10px]",
        "cursor-pointer mb-2 transition-all duration-200 ease-out shadow-sm",
        "hover:border-primary hover:shadow-md",
        "group"
      )}
    >
      {/* Number */}
      <span className="w-6 h-6 bg-muted rounded-md flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
        {index}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
          <WorkItemIcon type={item.type} size={14} />
          <button
            onClick={handleKeyClick}
            className="font-mono font-semibold text-primary hover:underline cursor-pointer"
          >
            {item.key}
          </button>
          <span className="truncate">{item.title}</span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {item.aiContext}
        </div>
      </div>
    </div>
  );
}
