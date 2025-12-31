/**
 * AI Next Item - "Then" section items
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { AINextItemData } from './CatalystAIPanel';

interface AINextItemProps {
  item: AINextItemData;
  index: number;
  onClick: () => void;
}

export function AINextItem({ item, index, onClick }: AINextItemProps) {
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
        <div className="text-[13px] font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
          <span className="font-mono font-semibold text-primary">{item.key}</span>{' '}
          {item.title}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {item.aiContext}
        </div>
      </div>
    </div>
  );
}
