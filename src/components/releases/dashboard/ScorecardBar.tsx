import { ScorecardMetrics } from '@/types/release-dashboard';
import { cn } from '@/lib/utils';

interface ScorecardBarProps {
  metrics: ScorecardMetrics;
  onFilterByStatus: (status: string | null) => void;
  activeFilter: string | null;
}

export function ScorecardBar({ metrics, onFilterByStatus, activeFilter }: ScorecardBarProps) {
  const items = [
    { key: null, label: 'Total', value: metrics.total, trend: null, color: 'text-foreground' },
    { key: 'passed', label: 'Passed', value: metrics.passed, trend: metrics.passedTrend, color: 'text-teal-600' },
    { key: 'failed', label: 'Failed', value: metrics.failed, trend: metrics.failedTrend, color: 'text-destructive' },
    { key: 'blocked', label: 'Blocked', value: metrics.blocked, trend: null, color: 'text-amber-600' },
    { key: 'notRun', label: 'Not Run', value: metrics.notRun, trend: null, color: 'text-muted-foreground' },
    { key: 'passRate', label: 'Pass Rate', value: `${metrics.passRate}%`, trend: `Target: ${metrics.targetPassRate}%`, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-6 gap-px bg-border rounded-lg overflow-hidden">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => onFilterByStatus(item.key)}
          className={cn(
            "bg-card p-3.5 text-left transition-colors hover:bg-muted/50",
            activeFilter === item.key && "bg-primary/5"
          )}
        >
          <div className={cn("text-2xl font-bold", item.color)}>{item.value}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">
            {item.label}
          </div>
          {item.trend && (
            <div className="text-[10px] font-medium text-muted-foreground mt-1">
              {item.trend}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
