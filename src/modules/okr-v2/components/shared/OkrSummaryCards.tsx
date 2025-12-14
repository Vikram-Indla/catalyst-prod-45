// ═══════════════════════════════════════════════════════════════════════════════
// OKR Summary Cards — Summary metrics for Strategy Cockpit (V2)
// Shows Total Objectives, On Track, At Risk, Blocked counts
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

export interface OkrSummaryMetrics {
  totalObjectives: number;
  onTrack: number;
  atRisk: number;
  blocked: number;
}

interface OkrSummaryCardsProps {
  metrics: OkrSummaryMetrics;
}

interface SummaryCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function SummaryCard({ label, value, variant = 'default' }: SummaryCardProps) {
  const valueColors = {
    default: 'text-foreground',
    success: 'text-secondary-green',
    warning: 'text-[#e07830]',
    danger: 'text-[#c44536]',
  };

  return (
    <div className="flex flex-col gap-2 px-5 py-4 bg-[#faf7f1] border border-border rounded-lg min-w-0">
      <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider truncate">
        {label}
      </span>
      <span className={cn(
        "text-3xl font-bold leading-none",
        valueColors[variant]
      )}>
        {value}
      </span>
    </div>
  );
}

export function OkrSummaryCards({ metrics }: OkrSummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <SummaryCard 
        label="Total Objectives" 
        value={metrics.totalObjectives} 
        variant="default"
      />
      <SummaryCard 
        label="On Track" 
        value={metrics.onTrack} 
        variant="success"
      />
      <SummaryCard 
        label="At Risk" 
        value={metrics.atRisk} 
        variant="warning"
      />
      <SummaryCard 
        label="Blocked" 
        value={metrics.blocked} 
        variant="danger"
      />
    </div>
  );
}
