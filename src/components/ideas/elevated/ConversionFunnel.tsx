// ============================================================
// CONVERSION FUNNEL - Visual Pipeline
// ============================================================

import { cn } from '@/lib/utils';

interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
  color: 'gray' | 'warning' | 'primary' | 'success';
}

interface ConversionFunnelProps {
  steps?: FunnelStep[];
  className?: string;
}

const defaultSteps: FunnelStep[] = [
  { label: 'Submitted', value: 147, percentage: 100, color: 'gray' },
  { label: 'Triaged', value: 125, percentage: 85, color: 'warning' },
  { label: 'Approved', value: 88, percentage: 60, color: 'primary' },
  { label: 'Converted', value: 62, percentage: 42, color: 'success' },
];

const colorMap = {
  gray: 'bg-slate-400',
  warning: 'bg-amber-500',
  primary: 'bg-blue-600',
  success: 'bg-emerald-500',
};

export function ConversionFunnel({ steps = defaultSteps, className }: ConversionFunnelProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 w-20 shrink-0">
            {step.label}
          </span>
          <div className="flex-1 h-6 bg-slate-100 rounded relative overflow-hidden">
            <div 
              className={cn("h-full rounded transition-all duration-500", colorMap[step.color])}
              style={{ width: `${step.percentage}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-10 text-right shrink-0">
            {step.percentage}%
          </span>
        </div>
      ))}
    </div>
  );
}
