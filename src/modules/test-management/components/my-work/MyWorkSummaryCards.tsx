/**
 * My Work Summary Cards
 * Displays summary statistics with clickable status filters
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  ClipboardList, 
  CircleDashed, 
  Play, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

interface MyWorkSummaryCardsProps {
  total: number;
  notRun: number;
  inProgress: number;
  passed: number;
  failed: number;
  onStatusClick: (status: string) => void;
  activeStatuses: string[];
}

interface StatCard {
  id: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  status?: string;
}

export function MyWorkSummaryCards({
  total,
  notRun,
  inProgress,
  passed,
  failed,
  onStatusClick,
  activeStatuses,
}: MyWorkSummaryCardsProps) {
  const cards: StatCard[] = [
    {
      id: 'total',
      label: 'Total Assigned',
      value: total,
      icon: ClipboardList,
      colorClass: 'text-foreground',
      bgClass: 'bg-muted',
    },
    {
      id: 'not_run',
      label: 'Not Run',
      value: notRun,
      icon: CircleDashed,
      colorClass: 'text-slate-600',
      bgClass: 'bg-slate-100 dark:bg-slate-900',
      status: 'not_run',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: inProgress,
      icon: Play,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50 dark:bg-blue-950',
      status: 'in_progress',
    },
    {
      id: 'passed',
      label: 'Passed Today',
      value: passed,
      icon: CheckCircle2,
      colorClass: 'text-green-600',
      bgClass: 'bg-green-50 dark:bg-green-950',
      status: 'passed',
    },
    {
      id: 'failed',
      label: 'Failed Today',
      value: failed,
      icon: XCircle,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50 dark:bg-red-950',
      status: 'failed',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 py-4 border-b border-border">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = card.status && activeStatuses.includes(card.status);
        const isClickable = !!card.status;

        return (
          <button
            key={card.id}
            onClick={() => card.status && onStatusClick(card.status)}
            disabled={!isClickable}
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg transition-all',
              card.bgClass,
              isClickable && 'hover:ring-2 hover:ring-primary/50 cursor-pointer',
              isActive && 'ring-2 ring-primary',
              !isClickable && 'cursor-default'
            )}
          >
            <div className={cn('p-2 rounded-md', card.bgClass)}>
              <Icon className={cn('h-5 w-5', card.colorClass)} />
            </div>
            <div className="text-left">
              <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
