/**
 * TMProgressBar - Execution progress bar for Test Management
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Status colors matching Catalyst design tokens
const STATUS_COLORS = {
  passed: '#10b981',
  failed: '#ef4444',
  blocked: '#f59e0b',
  skipped: '#8b5cf6',
  inProgress: '#6366f1',
  notRun: '#64748b',
} as const;

export interface TMProgressData {
  total: number;
  notRun: number;
  inProgress: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
}

interface TMProgressBarProps {
  data: TMProgressData;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function TMProgressBar({ 
  data, 
  size = 'md', 
  showLabel = false,
  showTooltip = true,
  className 
}: TMProgressBarProps) {
  const total = data.total || 1;
  
  const segments = [
    { key: 'passed', value: data.passed, color: STATUS_COLORS.passed, label: 'Passed' },
    { key: 'failed', value: data.failed, color: STATUS_COLORS.failed, label: 'Failed' },
    { key: 'blocked', value: data.blocked, color: STATUS_COLORS.blocked, label: 'Blocked' },
    { key: 'skipped', value: data.skipped, color: STATUS_COLORS.skipped, label: 'Skipped' },
    { key: 'inProgress', value: data.inProgress, color: STATUS_COLORS.inProgress, label: 'In Progress' },
    { key: 'notRun', value: data.notRun, color: STATUS_COLORS.notRun, label: 'Not Run' },
  ];
  
  const completed = data.passed + data.failed + data.blocked + data.skipped;
  const completionRate = Math.round((completed / total) * 100);
  const passRate = completed > 0 ? Math.round((data.passed / completed) * 100) : 0;
  
  const bar = (
    <div className={cn('w-full rounded-full overflow-hidden flex bg-muted', sizeClasses[size], className)}>
      {segments.map(segment => {
        const width = (segment.value / total) * 100;
        if (width === 0) return null;
        return (
          <div
            key={segment.key}
            className="transition-all duration-300"
            style={{ width: `${width}%`, backgroundColor: segment.color }}
          />
        );
      })}
    </div>
  );
  
  if (!showTooltip) return bar;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-default">
            {bar}
            {showLabel && (
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{completionRate}% Complete</span>
                <span>{passRate}% Pass Rate</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-48">
          <div className="space-y-2">
            <p className="font-medium text-sm">Execution Progress</p>
            <div className="space-y-1 text-xs">
              {segments.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span>{s.label}</span>
                  </div>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="font-medium">Total</span>
                <span className="font-medium">{total}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
