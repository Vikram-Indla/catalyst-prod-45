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
    default: 'text-[#24292F] dark:text-[#E6EDF3]',
    success: 'text-[#5C7C5C] dark:text-[#7DA37D]',
    warning: 'text-[#C69C6D] dark:text-[#D4B896]',
    danger: 'text-[#B85C5C] dark:text-[#D88888]',
  };

  return (
    <div className={cn(
      "flex flex-col gap-2 px-5 py-4 rounded-lg min-w-0",
      "bg-[#FAFBFC] dark:bg-[#161B22]",
      "border border-[#E1E4E8] dark:border-[#30363D]"
    )}>
      <span className="text-[11px] font-semibold text-[#8B949E] dark:text-[#6E7681] uppercase tracking-wider truncate">
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
