/**
 * Breakdown Tiles
 * Clickable tiles for severity, level, status, SLA state
 * Token-only styling, uniform appearance, semantic color for SLA only
 */

import { cn } from '@/lib/utils';
import type { BreakdownData, DrilldownFilter } from '../types';

interface BreakdownTilesProps {
  breakdowns: BreakdownData;
  onDrilldown: (filter: DrilldownFilter) => void;
  activeFilter: DrilldownFilter | null;
}

const SEVERITY_ORDER = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];
const LEVEL_ORDER = ['L1', 'L2', 'L3'];
const STATUS_ORDER = ['open', 'triage', 'in_progress', 'to_committee', 'resolved', 'closed'];
const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  triage: 'Triage',
  in_progress: 'In progress',
  to_committee: 'Committee',
  resolved: 'Resolved',
  closed: 'Closed',
};
const SLA_ORDER = ['on_track', 'at_risk', 'breached', 'n_a'];
const SLA_LABELS: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  breached: 'Breached',
  n_a: 'N/A',
};

interface TileProps {
  label: string;
  value: number;
  isActive: boolean;
  valueClassName?: string;
  onClick: () => void;
}

function Tile({ label, value, isActive, valueClassName, onClick }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-md border text-left transition-all cursor-pointer",
        "hover:shadow-sm hover:border-[var(--brand-primary)]",
        "bg-card border-border",
        isActive && "ring-2 ring-[var(--brand-primary)] border-[var(--brand-primary)]"
      )}
    >
      <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className={cn("text-lg font-bold tabular-nums text-foreground", valueClassName)}>
        {value}
      </div>
    </button>
  );
}

export function BreakdownTiles({ breakdowns, onDrilldown, activeFilter }: BreakdownTilesProps) {
  // Only SLA states get semantic colors when value > 0
  const getSLAValueClass = (state: string, value: number): string | undefined => {
    if (value === 0) return undefined;
    if (state === 'breached') return 'text-destructive';
    if (state === 'at_risk') return 'text-[hsl(var(--warning))]';
    return undefined;
  };

  return (
    <section className="mb-6 grid grid-cols-4 gap-5">
      {/* Severity Breakdown */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Severity
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {SEVERITY_ORDER.map(sev => (
            <Tile
              key={sev}
              label={sev}
              value={breakdowns.severity[sev] || 0}
              isActive={activeFilter?.type === 'severity' && activeFilter.value === sev}
              onClick={() => onDrilldown({ type: 'severity', value: sev, label: sev })}
            />
          ))}
        </div>
      </div>

      {/* Level Breakdown */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Level
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {LEVEL_ORDER.map(level => (
            <Tile
              key={level}
              label={level}
              value={breakdowns.level[level] || 0}
              isActive={activeFilter?.type === 'level' && activeFilter.value === level}
              onClick={() => onDrilldown({ type: 'level', value: level, label: level })}
            />
          ))}
        </div>
      </div>

      {/* Status Breakdown */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Status
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_ORDER.map(status => (
            <Tile
              key={status}
              label={STATUS_LABELS[status]}
              value={breakdowns.status[status] || 0}
              isActive={activeFilter?.type === 'status' && activeFilter.value === status}
              onClick={() => onDrilldown({ type: 'status', value: status, label: STATUS_LABELS[status] })}
            />
          ))}
        </div>
      </div>

      {/* SLA State Breakdown - Semantic colors only here */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          SLA State
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {SLA_ORDER.map(state => {
            const value = breakdowns.sla_state[state] || 0;
            return (
              <Tile
                key={state}
                label={SLA_LABELS[state]}
                value={value}
                isActive={activeFilter?.type === 'sla_state' && activeFilter.value === state}
                valueClassName={getSLAValueClass(state, value)}
                onClick={() => onDrilldown({ type: 'sla_state', value: state, label: SLA_LABELS[state] })}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
