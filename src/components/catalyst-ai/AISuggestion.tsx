/**
 * AI Suggestion - Quick action items
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface AISuggestionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export function AISuggestion({ icon, label, onClick }: AISuggestionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3.5 py-3 bg-surface-0 border border-border-subtle rounded-[10px]",
        "text-[13px] font-medium text-text-secondary cursor-pointer mb-2",
        "shadow-sm transition-all duration-200 ease-out",
        "hover:border-brand-primary hover:text-brand-primary hover:shadow-[0_2px_8px_rgba(37,99,235,0.1)] hover:translate-x-1",
        "group text-left"
      )}
    >
      {/* Icon container */}
      <div className="w-8 h-8 bg-surface-1 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:bg-brand-primary/10 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-text-muted group-hover:[&>svg]:text-brand-primary">
        {icon}
      </div>
      {label}
    </button>
  );
}
