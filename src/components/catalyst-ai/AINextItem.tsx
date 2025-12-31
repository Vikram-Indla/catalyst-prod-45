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
        "flex items-start gap-3 p-3 bg-surface-0 border border-border-subtle rounded-[10px]",
        "cursor-pointer mb-2 transition-all duration-200 ease-out shadow-sm",
        "hover:border-brand-primary hover:shadow-[0_2px_8px_rgba(37,99,235,0.08)]",
        "group"
      )}
    >
      {/* Number */}
      <span className="w-6 h-6 bg-surface-1 rounded-md flex items-center justify-center text-[12px] font-semibold text-text-muted flex-shrink-0">
        {index}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-text-primary mb-1 group-hover:text-brand-primary transition-colors">
          <span className="font-mono font-semibold text-brand-primary">{item.key}</span>{' '}
          {item.title}
        </div>
        <div className="text-[11px] text-text-muted truncate">
          {item.aiContext}
        </div>
      </div>
    </div>
  );
}
