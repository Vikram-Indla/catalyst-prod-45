/**
 * Summary Stats Component
 * Shows key metrics in a compact grid
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { TestScopeSummary } from '../types';

interface SummaryStatsProps {
  summary: TestScopeSummary;
  className?: string;
}

export function SummaryStats({ summary, className }: SummaryStatsProps) {
  const stats = [
    {
      label: 'Passed',
      value: summary.passedTests,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Failed',
      value: summary.failedTests,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Blocked',
      value: summary.blockedTests,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Not Run',
      value: summary.notRunTests,
      icon: Clock,
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
    },
  ];

  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-3 flex flex-col items-center">
              <div className={cn("p-2 rounded-full mb-2", stat.bgColor)}>
                <Icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
