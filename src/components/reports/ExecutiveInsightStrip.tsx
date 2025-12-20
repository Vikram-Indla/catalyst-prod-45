/**
 * ExecutiveInsightStrip — Compact insight cards for executive dashboards
 * 
 * Displays 3-5 key metrics in a horizontal strip above tables.
 * Uses semantic tokens, high-contrast text, no grey-on-white.
 */

import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface InsightCardProps {
  label: string;
  value: string | number;
  highlight?: 'danger' | 'warning' | 'success';
  icon?: ReactNode;
}

function InsightCard({ label, value, highlight, icon }: InsightCardProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      {icon && (
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-md",
          highlight === 'danger' && "bg-destructive/10 text-destructive",
          highlight === 'warning' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          highlight === 'success' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          !highlight && "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      )}
      <div className="flex flex-col">
        <span className={cn(
          "text-base font-semibold tabular-nums leading-tight",
          highlight === 'danger' ? "text-destructive" :
          highlight === 'warning' ? "text-amber-600 dark:text-amber-400" :
          highlight === 'success' ? "text-emerald-600 dark:text-emerald-400" :
          "text-foreground"
        )}>
          {value}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground leading-tight uppercase tracking-wide">
          {label}
        </span>
      </div>
    </div>
  );
}

interface ExecutiveInsightStripProps {
  title: string;
  insights: InsightCardProps[];
  className?: string;
}

export function ExecutiveInsightStrip({ title, insights, className }: ExecutiveInsightStripProps) {
  return (
    <div className={cn("border border-border rounded-md bg-card mb-4", className)}>
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="flex flex-wrap items-center divide-x divide-border">
        {insights.map((insight, idx) => (
          <InsightCard key={idx} {...insight} />
        ))}
      </div>
    </div>
  );
}
