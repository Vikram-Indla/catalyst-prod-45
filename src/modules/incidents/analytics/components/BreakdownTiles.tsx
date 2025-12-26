/**
 * Breakdown Tiles
 * Uniform card-based grid for severity, level, status, SLA state
 * Token-only styling, premium enterprise appearance
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
  in_progress: 'In Progress',
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
        "p-3 sm:p-4 rounded-lg border text-left transition-all cursor-pointer min-h-[60px] sm:min-h-[72px]",
        "hover:shadow-sm hover:border-[var(--brand-primary)] hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]",
        "bg-card border-border",
        isActive && "ring-2 ring-[var(--brand-primary)] border-[var(--brand-primary)] shadow-sm"
      )}
    >
      <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 sm:mb-1.5">
        {label}
      </div>
      <div className={cn("text-xl sm:text-2xl font-bold tabular-nums text-foreground leading-none", valueClassName)}>
        {value}
      </div>
    </button>
  );
}

interface BreakdownCardProps {
  title: string;
  children: React.ReactNode;
}

function BreakdownCard({ title, children }: BreakdownCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
      <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">
        {title}
      </h3>
      {children}
    </div>
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
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Operational Distribution
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {/* Severity Breakdown */}
        <BreakdownCard title="Severity">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
        </BreakdownCard>

        {/* Level Breakdown */}
        <BreakdownCard title="Support Level">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
        </BreakdownCard>

        {/* Status Breakdown */}
        <BreakdownCard title="Status">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
        </BreakdownCard>

        {/* SLA State Breakdown - Semantic colors only here */}
        <BreakdownCard title="SLA State">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
        </BreakdownCard>
      </div>
    </section>
  );
}
