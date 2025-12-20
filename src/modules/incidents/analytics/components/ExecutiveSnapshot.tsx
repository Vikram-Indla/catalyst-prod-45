/**
 * Executive Snapshot KPIs
 * Clickable KPI cards for the analytics control room
 * Neutral by default, semantic emphasis only for urgent items
 */

import { cn } from '@/lib/utils';
import type { AnalyticsSnapshot, DrilldownFilter } from '../types';

interface ExecutiveSnapshotProps {
  snapshot: AnalyticsSnapshot;
  onDrilldown: (filter: DrilldownFilter) => void;
  activeFilter: DrilldownFilter | null;
}

const KPI_CONFIG = [
  { key: 'open', label: 'Open', filterType: 'open', urgency: 'none' },
  { key: 'major_active', label: 'Major Active', filterType: 'major_active', urgency: 'critical' },
  { key: 'sla_breached', label: 'SLA Breached', filterType: 'sla_breached', urgency: 'critical' },
  { key: 'sla_at_risk', label: 'SLA At Risk', filterType: 'sla_at_risk', urgency: 'warning' },
  { key: 'committee', label: 'Committee', filterType: 'committee', urgency: 'none' },
] as const;

export function ExecutiveSnapshot({ snapshot, onDrilldown, activeFilter }: ExecutiveSnapshotProps) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Executive Snapshot
      </h2>
      <div className="grid grid-cols-5 gap-3">
        {KPI_CONFIG.map(({ key, label, filterType, urgency }) => {
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
                "p-4 rounded-md border text-left transition-all cursor-pointer h-[72px]",
                "hover:shadow-sm hover:border-[var(--brand-primary)]",
                "bg-card border-border",
                isActive && "ring-2 ring-[var(--brand-primary)] border-[var(--brand-primary)]"
              )}
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                {label}
              </div>
              <div className={cn(
                "text-2xl font-bold tabular-nums",
                showCritical && "text-destructive",
                showWarning && "text-[hsl(var(--warning))]",
                !showCritical && !showWarning && "text-foreground"
              )}>
                {value}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
