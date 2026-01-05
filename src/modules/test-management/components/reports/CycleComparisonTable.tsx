/**
 * Cycle Comparison Table - Compares metrics across test cycles
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CycleComparison } from '../../api/types';

interface CycleComparisonTableProps {
  cycles: CycleComparison[];
  className?: string;
}

const statusColors: Record<string, string> = {
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  planned: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function CycleComparisonTable({ cycles, className }: CycleComparisonTableProps) {
  return (
    <div className={cn('bg-background border rounded-xl overflow-hidden', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="text-sm font-semibold text-foreground">Cycle Comparison</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Cycle
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Tests
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Results
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Pass Rate
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((cycle) => (
              <tr key={cycle.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[11px] bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                      {cycle.key}
                    </Badge>
                    <span className="text-sm text-foreground truncate max-w-[150px]">
                      {cycle.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn('text-[10px] font-medium', statusColors[cycle.status] || statusColors.planned)}>
                    {cycle.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  {cycle.test_case_count}
                </td>
                <td className="px-4 py-3">
                  <MiniStackedBar 
                    passed={cycle.passed_count}
                    failed={cycle.failed_count}
                    blocked={cycle.blocked_count}
                    skipped={cycle.skipped_count}
                    total={cycle.test_case_count}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={cn(
                    'text-sm font-bold',
                    cycle.pass_rate >= 80 ? 'text-teal-600' : 
                    cycle.pass_rate >= 50 ? 'text-orange-600' : 'text-destructive'
                  )}>
                    {cycle.pass_rate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <TrendIndicator value={cycle.trend_vs_previous} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface MiniStackedBarProps {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  total: number;
}

function MiniStackedBar({ passed, failed, blocked, skipped, total }: MiniStackedBarProps) {
  if (total === 0) return <div className="h-1.5 w-24 bg-muted rounded-full" />;
  
  const passedPct = (passed / total) * 100;
  const failedPct = (failed / total) * 100;
  const blockedPct = (blocked / total) * 100;
  const skippedPct = (skipped / total) * 100;

  return (
    <div className="flex h-1.5 w-24 rounded-full overflow-hidden">
      <div className="bg-teal-500" style={{ width: `${passedPct}%` }} />
      <div className="bg-red-500" style={{ width: `${failedPct}%` }} />
      <div className="bg-orange-500" style={{ width: `${blockedPct}%` }} />
      <div className="bg-gray-400" style={{ width: `${skippedPct}%` }} />
    </div>
  );
}

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">—</span>;
  
  const isUp = value > 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold',
      isUp ? 'text-teal-600' : 'text-destructive'
    )}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}{value}%
    </span>
  );
}
