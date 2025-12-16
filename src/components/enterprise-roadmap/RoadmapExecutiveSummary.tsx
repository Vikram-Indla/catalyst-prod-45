// Executive Summary Strip for Theme Roadmap
// Per markdown spec: displays total themes, status counts, and today indicator

import { cn } from '@/lib/utils';
import { RoadmapItem, HealthStatus } from './types';
import { format } from 'date-fns';

interface RoadmapExecutiveSummaryProps {
  items: RoadmapItem[];
}

// Calculate health status counts
function calculateHealthCounts(items: RoadmapItem[]): Record<HealthStatus | 'unknown', number> {
  const counts: Record<HealthStatus | 'unknown', number> = {
    'on-track': 0,
    'at-risk': 0,
    'delayed': 0,
    'unknown': 0
  };
  
  const countItems = (itemList: RoadmapItem[]) => {
    for (const item of itemList) {
      const health = item.health || (item.status === 'active' ? 'on-track' : item.status === 'proposed' ? 'at-risk' : 'unknown');
      if (health === 'on-track' || health === 'at-risk' || health === 'delayed') {
        counts[health]++;
      } else {
        counts['unknown']++;
      }
      if (item.children) {
        countItems(item.children);
      }
    }
  };
  
  countItems(items);
  return counts;
}

export function RoadmapExecutiveSummary({ items }: RoadmapExecutiveSummaryProps) {
  const healthCounts = calculateHealthCounts(items);
  const totalThemes = items.filter(i => i.type === 'theme').length;
  const today = format(new Date(), 'MMM d, yyyy');

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2",
      "bg-surface-subtle dark:bg-[#0D1117]",
      "border-b border-border"
    )}>
      {/* Left: Total Themes */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{totalThemes}</span>
          <span className="text-sm text-muted-foreground">Total Themes</span>
        </div>
        
        {/* Status Counts */}
        <div className="flex items-center gap-4 pl-4 border-l border-border">
          {/* On Track */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--status-success))]" />
            <span className="text-sm font-medium text-foreground">{healthCounts['on-track']}</span>
            <span className="text-sm text-muted-foreground">On Track</span>
          </div>
          
          {/* At Risk */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--status-warning))]" />
            <span className="text-sm font-medium text-foreground">{healthCounts['at-risk']}</span>
            <span className="text-sm text-muted-foreground">At Risk</span>
          </div>
          
          {/* Delayed */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--status-danger))]" />
            <span className="text-sm font-medium text-foreground">{healthCounts['delayed']}</span>
            <span className="text-sm text-muted-foreground">Delayed</span>
          </div>
        </div>
      </div>

      {/* Right: Today Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Today:</span>
        <span className="font-medium text-foreground">{today}</span>
      </div>
    </div>
  );
}
