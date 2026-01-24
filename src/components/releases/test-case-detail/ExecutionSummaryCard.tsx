/**
 * Execution Summary Card — Shows pass rate, trends, and quick stats
 */

import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Execution history item shape for UI display */
export interface ExecutionHistoryItem {
  id: number | string;
  cycleId: string;
  cycleName: string;
  status: 'passed' | 'failed' | 'blocked' | 'not_run';
  executor: string;
  duration: string;
  timestamp: string;
}

interface ExecutionSummaryCardProps {
  history: ExecutionHistoryItem[];
}

export function ExecutionSummaryCard({ history }: ExecutionSummaryCardProps) {
  // Calculate stats
  const totalRuns = history.length;
  const passedRuns = history.filter(h => h.status === 'passed').length;
  const failedRuns = history.filter(h => h.status === 'failed').length;
  const blockedRuns = history.filter(h => h.status === 'blocked').length;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
  
  // Calculate trend (compare last 3 runs vs previous 3)
  const recentRuns = history.slice(0, 3);
  const previousRuns = history.slice(3, 6);
  const recentPassRate = recentRuns.length > 0 
    ? (recentRuns.filter(r => r.status === 'passed').length / recentRuns.length) * 100 
    : 0;
  const previousPassRate = previousRuns.length > 0 
    ? (previousRuns.filter(r => r.status === 'passed').length / previousRuns.length) * 100 
    : 0;
  const trend = recentPassRate - previousPassRate;
  
  // Calculate average duration
  const avgDuration = history.length > 0 
    ? history.reduce((acc, h) => {
        const match = h.duration.match(/(\d+)m\s*(\d+)?s?/);
        if (match) {
          const minutes = parseInt(match[1]) || 0;
          const seconds = parseInt(match[2]) || 0;
          return acc + minutes * 60 + seconds;
        }
        return acc;
      }, 0) / history.length
    : 0;
  const avgMinutes = Math.floor(avgDuration / 60);
  const avgSeconds = Math.round(avgDuration % 60);

  // Recent run statuses (last 5)
  const recentStatuses = history.slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'blocked': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <h4 className="font-medium text-sm text-foreground">Execution Summary</h4>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Pass Rate */}
        <div className="text-center">
          <div className={cn(
            "text-3xl font-bold",
            passRate >= 80 ? 'text-green-600' : passRate >= 50 ? 'text-yellow-600' : 'text-red-600'
          )}>
            {passRate}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Pass Rate</div>
          {trend !== 0 && previousRuns.length > 0 && (
            <div className={cn(
              "flex items-center justify-center gap-0.5 text-xs mt-1",
              trend > 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(Math.round(trend))}%
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-lg font-semibold">{passedRuns}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-lg font-semibold">{failedRuns}</span>
            </div>
            <div className="flex items-center gap-1">
              <MinusCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-lg font-semibold">{blockedRuns}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{totalRuns} Total Runs</div>
        </div>

        {/* Avg Duration */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-lg font-semibold">
              {avgMinutes}m {avgSeconds}s
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Avg. Duration</div>
        </div>

        {/* Recent Trend */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {recentStatuses.map((run, index) => (
              <motion.div
                key={run.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "w-5 h-5 rounded-full",
                  getStatusColor(run.status)
                )}
                title={`${run.cycleName}: ${run.status}`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Recent Runs</div>
        </div>
      </div>
    </motion.div>
  );
}
