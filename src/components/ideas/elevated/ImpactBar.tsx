// ============================================================
// IMPACT BAR - Visual Score Display
// ============================================================

import { cn } from '@/lib/utils';

interface ImpactBarProps {
  score: number; // 0-5 scale
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ImpactBar({ 
  score, 
  showLabel = true, 
  size = 'md',
  className 
}: ImpactBarProps) {
  const percentage = Math.min(100, (score / 5) * 100);
  
  const sizeConfig = {
    sm: { bar: 'h-1', text: 'text-xs', label: 'text-[10px]' },
    md: { bar: 'h-1.5', text: 'text-sm', label: 'text-[11px]' },
    lg: { bar: 'h-2', text: 'text-base', label: 'text-xs' },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <span className={cn(
          "font-semibold text-slate-500 uppercase tracking-wide shrink-0 w-12",
          config.label
        )}>
          IMPACT
        </span>
      )}
      <div className={cn(
        "flex-1 bg-slate-100 rounded-full overflow-hidden",
        config.bar
      )}>
        <div 
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("font-bold text-slate-900 shrink-0 w-8 text-right", config.text)}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// Large centered display for detail view
export function ImpactScoreDisplay({ score }: { score: number }) {
  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center">
        <span className="text-[56px] font-bold text-teal-600 leading-none tracking-tight">
          {score.toFixed(1)}
        </span>
        <span className="text-xl text-slate-400 font-medium ml-1">/5</span>
      </div>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1 block">
        IMPACT Score
      </span>
    </div>
  );
}
