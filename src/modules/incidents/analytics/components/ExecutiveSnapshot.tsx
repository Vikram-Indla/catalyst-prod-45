/**
 * Executive Snapshot KPIs
 * Clickable KPI cards for the analytics control room
 */

import { cn } from '@/lib/utils';
import type { AnalyticsSnapshot, DrilldownFilter } from '../types';

interface ExecutiveSnapshotProps {
  snapshot: AnalyticsSnapshot;
  onDrilldown: (filter: DrilldownFilter) => void;
  activeFilter: DrilldownFilter | null;
}

const KPI_CONFIG = [
  { key: 'open', label: 'Open', filterType: 'open' },
  { key: 'major_active', label: 'Major Active', filterType: 'major_active' },
  { key: 'sla_breached', label: 'SLA Breached', filterType: 'sla_breached' },
  { key: 'sla_at_risk', label: 'SLA At Risk', filterType: 'sla_at_risk' },
  { key: 'committee', label: 'Committee', filterType: 'committee' },
] as const;

export function ExecutiveSnapshot({ snapshot, onDrilldown, activeFilter }: ExecutiveSnapshotProps) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Executive Snapshot
      </h2>
      <div className="grid grid-cols-5 gap-3">
        {KPI_CONFIG.map(({ key, label, filterType }) => {
          const value = snapshot[key as keyof AnalyticsSnapshot];
          const isActive = activeFilter?.type === filterType;
          const isUrgent = (key === 'sla_breached' || key === 'major_active') && value > 0;
          const isWarning = key === 'sla_at_risk' && value > 0;

          return (
            <button
              key={key}
              onClick={() => onDrilldown({ type: filterType, label })}
              className={cn(
                "p-4 rounded-lg border text-left transition-all cursor-pointer",
                "hover:shadow-md hover:border-[var(--brand-primary)]",
                isActive && "ring-2 ring-[var(--brand-primary)] border-[var(--brand-primary)]",
                !isActive && "bg-card border-border"
              )}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                {label}
              </div>
              <div className={cn(
                "text-3xl font-bold tabular-nums",
                isUrgent && "text-destructive",
                isWarning && "text-[hsl(var(--warning,35_92%_50%))]",
                !isUrgent && !isWarning && "text-foreground"
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
