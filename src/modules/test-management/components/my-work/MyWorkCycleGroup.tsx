/**
 * My Work Cycle Group
 * Expandable group of test cases within a cycle
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { MyWorkItem } from '../../api/types';

interface MyWorkCycleGroupProps {
  cycleId: string;
  cycleTitle: string;
  items: MyWorkItem[];
  urgency: 'overdue' | 'due_today' | 'on_track';
  dueDate?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onStartTesting: (scopeId: string) => void;
}

const URGENCY_CONFIG = {
  overdue: {
    label: 'Overdue',
    bgClass: 'bg-red-100 dark:bg-red-950',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-900',
    icon: AlertTriangle,
  },
  due_today: {
    label: 'Due Today',
    bgClass: 'bg-yellow-100 dark:bg-yellow-950',
    textClass: 'text-yellow-700 dark:text-yellow-400',
    borderClass: 'border-yellow-200 dark:border-yellow-900',
    icon: Clock,
  },
  on_track: {
    label: 'On Track',
    bgClass: 'bg-green-100 dark:bg-green-950',
    textClass: 'text-green-700 dark:text-green-400',
    borderClass: 'border-green-200 dark:border-green-900',
    icon: CheckCircle2,
  },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_run: {
    label: 'Not Run',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  passed: {
    label: 'Passed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
};

export function MyWorkCycleGroup({
  cycleId,
  cycleTitle,
  items,
  urgency,
  dueDate,
  isExpanded,
  onToggle,
  onStartTesting,
}: MyWorkCycleGroupProps) {
  const urgencyConfig = URGENCY_CONFIG[urgency];
  const UrgencyIcon = urgencyConfig.icon;

  const formattedDueDate = dueDate && isValid(parseISO(dueDate))
    ? format(parseISO(dueDate), 'MMM d, yyyy')
    : null;

  // Calculate status counts
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all',
        urgencyConfig.borderClass
      )}
    >
      {/* Cycle Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-colors',
          urgencyConfig.bgClass,
          'hover:opacity-90'
        )}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">{cycleTitle}</h3>
              <Badge variant="outline" className="text-xs">
                {items.length} case{items.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            {formattedDueDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Due: {formattedDueDate}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status breakdown mini badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            {Object.entries(statusCounts).map(([status, count]) => (
              <span
                key={status}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  STATUS_CONFIG[status]?.className || 'bg-muted'
                )}
              >
                {count}
              </span>
            ))}
          </div>

          {/* Urgency badge */}
          <Badge className={cn(urgencyConfig.bgClass, urgencyConfig.textClass, 'gap-1')}>
            <UrgencyIcon className="h-3 w-3" />
            {urgencyConfig.label}
          </Badge>
        </div>
      </button>

      {/* Expanded Case List */}
      {isExpanded && (
        <div className="divide-y divide-border">
          {items.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_run;
            const isRunnable = item.status === 'not_run' || item.status === 'in_progress';

            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    variant="outline"
                    className={cn('text-xs shrink-0', statusConfig.className)}
                  >
                    {statusConfig.label}
                  </Badge>
                  
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.key}</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isRunnable ? 'default' : 'outline'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartTesting(item.id);
                  }}
                  className="shrink-0 gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  {item.status === 'in_progress' ? 'Continue' : 'Start'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
