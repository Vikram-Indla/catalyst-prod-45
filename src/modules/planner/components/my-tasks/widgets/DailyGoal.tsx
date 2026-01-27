// ============================================================
// DAILY GOAL WIDGET
// Planner V9: Daily task completion goal with streak tracking
// ============================================================

import { Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useMyTasksSummary } from '../../../hooks/useMyTasks';

interface DailyGoalProps {
  className?: string;
  dailyTarget?: number;
}

export function DailyGoal({ className, dailyTarget = 5 }: DailyGoalProps) {
  const { data: summary } = useMyTasksSummary();
  
  const completed = summary?.completed_today || 0;
  const percentage = Math.min(Math.round((completed / dailyTarget) * 100), 100);
  
  // Mock streak - would be calculated from actual historical data
  const streak = 5;

  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Daily Goal
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 rounded-full">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
            {streak} day streak
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <Progress 
          value={percentage} 
          className="h-2.5 bg-amber-200/50 dark:bg-amber-800/30"
        />
      </div>

      {/* Status Text */}
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-amber-700 dark:text-amber-400">{completed}</span>
        {' '}of{' '}
        <span className="font-semibold">{dailyTarget}</span>
        {' '}tasks completed today
      </p>

      {/* Motivational Message */}
      {percentage >= 100 && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
          🎉 Goal achieved! You're on fire!
        </p>
      )}
      {percentage >= 80 && percentage < 100 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
          Almost there! Keep going! 💪
        </p>
      )}
    </div>
  );
}
