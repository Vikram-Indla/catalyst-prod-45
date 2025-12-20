/**
 * Executive Snapshot KPIs
 * Premium hero-level KPI row for the analytics control room
 * Large numbers, strong visual presence, semantic emphasis for risk only
 */

import { cn } from '@/lib/utils';
import type { AnalyticsSnapshot, DrilldownFilter } from '../types';

interface ExecutiveSnapshotProps {
  snapshot: AnalyticsSnapshot;
  onDrilldown: (filter: DrilldownFilter) => void;
  activeFilter: DrilldownFilter | null;
}

const KPI_CONFIG = [
  { key: 'open', label: 'Open', filterType: 'open', urgency: 'none', description: 'Total open incidents' },
  { key: 'major_active', label: 'Major Active', filterType: 'major_active', urgency: 'critical', description: 'Major incidents in progress' },
  { key: 'sla_breached', label: 'SLA Breached', filterType: 'sla_breached', urgency: 'critical', description: 'Past resolution target' },
  { key: 'sla_at_risk', label: 'SLA At Risk', filterType: 'sla_at_risk', urgency: 'warning', description: 'Approaching deadline' },
  { key: 'committee', label: 'Committee', filterType: 'committee', urgency: 'none', description: 'Pending committee decision' },
] as const;

export function ExecutiveSnapshot({ snapshot, onDrilldown, activeFilter }: ExecutiveSnapshotProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Executive Snapshot
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {KPI_CONFIG.map(({ key, label, filterType, urgency, description }) => {
          const value = snapshot[key as keyof AnalyticsSnapshot];
          const isActive = activeFilter?.type === filterType;
          
          // Only apply urgency styling when value > 0
          const showCritical = urgency === 'critical' && value > 0;
          const showWarning = urgency === 'warning' && value > 0;

          return (
            <button
              key={key}
              onClick={() => onDrilldown({ type: filterType, label })}
              className={cn(
                "group relative p-5 rounded-lg border text-left transition-all cursor-pointer",
                "hover:shadow-md hover:border-[var(--brand-primary)] hover:-translate-y-0.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
                "bg-card border-border",
                isActive && "ring-2 ring-[var(--brand-primary)] border-[var(--brand-primary)] shadow-md"
              )}
            >
              {/* Label */}
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {label}
              </div>
              
              {/* Value - Large and prominent */}
              <div className={cn(
                "text-4xl font-bold tabular-nums leading-none",
                showCritical && "text-destructive",
                showWarning && "text-[hsl(var(--warning))]",
                !showCritical && !showWarning && "text-foreground"
              )}>
                {value}
              </div>

              {/* Description on hover */}
              <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {description}
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
              )}

              {/* Urgency indicator bar at bottom */}
              {value > 0 && urgency !== 'none' && (
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-1 rounded-b-lg",
                  showCritical && "bg-destructive",
                  showWarning && "bg-[hsl(var(--warning))]"
                )} />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
