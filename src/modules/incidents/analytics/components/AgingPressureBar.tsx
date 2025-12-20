/**
 * Aging Pressure Bar
 * Horizontal segmented bar showing incident age distribution
 * Innovative executive-readable pressure signal
 */

import { cn } from '@/lib/utils';
import type { IncidentWithSLA, DrilldownFilter } from '../types';

interface AgingPressureBarProps {
  incidents: IncidentWithSLA[];
  onDrilldown: (filter: DrilldownFilter, incidents: IncidentWithSLA[]) => void;
}

interface AgeBucket {
  key: string;
  label: string;
  minHours: number;
  maxHours: number | null;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

const AGE_BUCKETS: AgeBucket[] = [
  { key: 'fresh', label: '<24h', minHours: 0, maxHours: 24, urgency: 'low' },
  { key: 'aging', label: '1–3d', minHours: 24, maxHours: 72, urgency: 'medium' },
  { key: 'stale', label: '3–7d', minHours: 72, maxHours: 168, urgency: 'high' },
  { key: 'critical', label: '>7d', minHours: 168, maxHours: null, urgency: 'critical' },
];

const URGENCY_STYLES: Record<string, { bg: string; bgHover: string; text: string }> = {
  low: { 
    bg: 'bg-muted/60', 
    bgHover: 'hover:bg-muted', 
    text: 'text-muted-foreground' 
  },
  medium: { 
    bg: 'bg-muted', 
    bgHover: 'hover:bg-muted/80', 
    text: 'text-foreground' 
  },
  high: { 
    bg: 'bg-[hsl(var(--warning)/0.15)]', 
    bgHover: 'hover:bg-[hsl(var(--warning)/0.25)]', 
    text: 'text-[hsl(var(--warning))]' 
  },
  critical: { 
    bg: 'bg-destructive/10', 
    bgHover: 'hover:bg-destructive/20', 
    text: 'text-destructive' 
  },
};

export function AgingPressureBar({ incidents, onDrilldown }: AgingPressureBarProps) {
  // Calculate counts for each bucket
  const bucketCounts = AGE_BUCKETS.map(bucket => {
    const filtered = incidents.filter(inc => {
      if (bucket.maxHours === null) {
        return inc.age_hours >= bucket.minHours;
      }
      return inc.age_hours >= bucket.minHours && inc.age_hours < bucket.maxHours;
    });
    return {
      ...bucket,
      count: filtered.length,
      incidents: filtered,
    };
  });

  const total = incidents.length;
  const hasData = total > 0;

  const handleBucketClick = (bucket: typeof bucketCounts[0]) => {
    if (bucket.count === 0) return;
    onDrilldown(
      { 
        type: 'open', 
        label: `Age: ${bucket.label}`,
        value: bucket.key,
      },
      bucket.incidents
    );
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Aging Pressure
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {total} open incident{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Pressure Bar */}
      <div className="flex items-stretch gap-1 h-16 rounded-lg overflow-hidden border border-border bg-card">
        {bucketCounts.map((bucket) => {
          const percentage = hasData ? (bucket.count / total) * 100 : 25;
          const styles = URGENCY_STYLES[bucket.urgency];
          
          return (
            <button
              key={bucket.key}
              onClick={() => handleBucketClick(bucket)}
              disabled={bucket.count === 0}
              style={{ flex: hasData ? bucket.count || 0.1 : 1 }}
              className={cn(
                "relative flex flex-col items-center justify-center transition-all min-w-[80px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary)]",
                styles.bg,
                bucket.count > 0 && styles.bgHover,
                bucket.count > 0 && "cursor-pointer",
                bucket.count === 0 && "opacity-50 cursor-default"
              )}
            >
              {/* Count */}
              <span className={cn(
                "text-2xl font-bold tabular-nums leading-none mb-1",
                bucket.count > 0 ? styles.text : 'text-muted-foreground/50'
              )}>
                {bucket.count}
              </span>
              
              {/* Label */}
              <span className="text-xs font-medium text-muted-foreground">
                {bucket.label}
              </span>

              {/* Percentage indicator for non-empty buckets */}
              {hasData && bucket.count > 0 && (
                <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/60 tabular-nums">
                  {Math.round(percentage)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted" />
          Fresh
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          Aging
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--warning)/0.6)]" />
          Stale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive/60" />
          Critical
        </span>
      </div>
    </section>
  );
}
