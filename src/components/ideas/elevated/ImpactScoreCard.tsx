// ============================================================
// IMPACT SCORE CARD - Detailed Breakdown
// ============================================================

import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImpactScoreDisplay } from './ImpactBar';

interface ImpactFactor {
  key: string;
  label: string;
  value: number;
  weight: number;
}

interface ImpactScoreCardProps {
  score: number;
  factors?: ImpactFactor[];
  className?: string;
}

const defaultFactors: ImpactFactor[] = [
  { key: 'I', label: 'Imperative', value: 0, weight: 25 },
  { key: 'M', label: 'Ministry Efficiency', value: 0, weight: 15 },
  { key: 'P', label: 'Pain Severity', value: 0, weight: 20 },
  { key: 'A', label: 'Alignment', value: 0, weight: 20 },
  { key: 'C', label: 'Complexity', value: 0, weight: 10 },
  { key: 'T', label: 'Timeframe', value: 0, weight: 10 },
];

export function ImpactScoreCard({ score, factors, className }: ImpactScoreCardProps) {
  const displayFactors = factors || defaultFactors.map(f => ({ ...f, value: score }));
  // Normalize score to /5 if it's /100
  const normalizedScore = score > 5 ? score / 20 : score;

  return (
    <div className={cn(
      "bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6",
      className
    )}>
      {/* Large Score Display */}
      <ImpactScoreDisplay score={normalizedScore} />

      {/* Factor Breakdown */}
      <div className="mt-6 space-y-3">
        {displayFactors.map((factor) => (
          <div key={factor.key} className="flex items-center gap-3">
            {/* Letter Badge */}
            <div className="w-6 h-6 rounded-md bg-teal-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {factor.key}
            </div>
            
            {/* Label */}
            <span className="text-sm text-slate-600 w-28 shrink-0">
              {factor.label}
            </span>
            
            {/* Bar */}
            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${(factor.value / 5) * 100}%` }}
              />
            </div>
            
            {/* Value */}
            <span className="text-sm font-semibold text-slate-700 w-8 text-right">
              {factor.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Weight Hint */}
      <p className="text-[11px] text-slate-500 text-center mt-4">
        Weights: I(25%) M(15%) P(20%) A(20%) C(10%) T(10%)
      </p>
    </div>
  );
}
