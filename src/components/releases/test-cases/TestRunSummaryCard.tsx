/**
 * TestRunSummaryCard — Displays test run execution summary
 */

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  Clock,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestRunSummaryCardProps {
  run: {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'aborted';
    startedAt: string;
    completedAt?: string;
    executor: string;
    totalCases: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    notRun: number;
    duration?: string;
    previousPassRate?: number;
  };
  onClick?: () => void;
  className?: string;
}

export function TestRunSummaryCard({ run, onClick, className }: TestRunSummaryCardProps) {
  const completed = run.passed + run.failed + run.blocked + run.skipped;
  const passRate = completed > 0 ? Math.round((run.passed / completed) * 100) : 0;
  const progress = Math.round((completed / run.totalCases) * 100);

  const passRateTrend = run.previousPassRate !== undefined 
    ? passRate - run.previousPassRate 
    : null;

  const getStatusColor = () => {
    switch (run.status) {
      case 'running':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'completed':
        return passRate >= 80 
          ? 'bg-green-500/10 text-green-600 border-green-200'
          : 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'aborted':
        return 'bg-red-500/10 text-red-600 border-red-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border bg-card shadow-sm cursor-pointer transition-all hover:shadow-md",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">{run.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{run.id}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs", getStatusColor())}>
          {run.status === 'running' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />
          )}
          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
        </Badge>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-green-500/10">
          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
          <span className="text-sm font-semibold text-green-600">{run.passed}</span>
          <p className="text-[10px] text-muted-foreground">Passed</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-500/10">
          <XCircle className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <span className="text-sm font-semibold text-red-600">{run.failed}</span>
          <p className="text-[10px] text-muted-foreground">Failed</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-orange-500/10">
          <AlertTriangle className="w-4 h-4 text-orange-500 mx-auto mb-1" />
          <span className="text-sm font-semibold text-orange-600">{run.blocked}</span>
          <p className="text-[10px] text-muted-foreground">Blocked</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted">
          <SkipForward className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <span className="text-sm font-semibold">{run.skipped}</span>
          <p className="text-[10px] text-muted-foreground">Skipped</p>
        </div>
      </div>

      {/* Pass Rate */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-3">
        <span className="text-sm text-muted-foreground">Pass Rate</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-lg font-bold",
            passRate >= 80 ? "text-green-600" : passRate >= 50 ? "text-orange-600" : "text-red-600"
          )}>
            {passRate}%
          </span>
          {passRateTrend !== null && (
            <span className={cn(
              "flex items-center text-xs",
              passRateTrend > 0 ? "text-green-600" : passRateTrend < 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {passRateTrend > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  +{passRateTrend}%
                </>
              ) : passRateTrend < 0 ? (
                <>
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                  {passRateTrend}%
                </>
              ) : (
                '—'
              )}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>{run.executor}</span>
        </div>
        <div className="flex items-center gap-3">
          {run.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{run.duration}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(run.startedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
