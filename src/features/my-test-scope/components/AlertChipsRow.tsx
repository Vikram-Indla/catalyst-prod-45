/**
 * Alert Chips Row Component
 * Quick filter chips for urgent items
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Bug, AlertCircle } from 'lucide-react';
import type { TestScopeSummary, TestScopeFilters } from '../types';

interface AlertChipsRowProps {
  summary: TestScopeSummary;
  defectCount: number;
  incidentCount: number;
  activeAlert: TestScopeFilters['alert'];
  onAlertChange: (alert: TestScopeFilters['alert']) => void;
  className?: string;
}

export function AlertChipsRow({
  summary,
  defectCount,
  incidentCount,
  activeAlert,
  onAlertChange,
  className,
}: AlertChipsRowProps) {
  const alerts = [
    {
      id: 'overdue' as const,
      label: 'Overdue',
      count: summary.overdue,
      icon: AlertTriangle,
      activeClass: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      pulseClass: 'bg-red-500',
    },
    {
      id: 'due_today' as const,
      label: 'Due Today',
      count: summary.due_today,
      icon: Clock,
      activeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      pulseClass: 'bg-amber-500',
    },
    {
      id: 'defects' as const,
      label: 'Linked Defects',
      count: defectCount,
      icon: Bug,
      activeClass: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      pulseClass: 'bg-orange-500',
    },
    {
      id: 'incidents' as const,
      label: 'Active Incidents',
      count: incidentCount,
      icon: AlertCircle,
      activeClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      pulseClass: 'bg-purple-500',
    },
  ];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {alerts.map((alert) => {
        const isActive = activeAlert === alert.id;
        const hasItems = alert.count > 0;
        const Icon = alert.icon;

        return (
          <button
            key={alert.id}
            onClick={() => onAlertChange(isActive ? null : alert.id)}
            disabled={!hasItems}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
              "border transition-all duration-200",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              isActive
                ? alert.activeClass
                : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {/* Pulse indicator for urgent items */}
            {hasItems && (alert.id === 'overdue' || alert.id === 'due_today') && (
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  alert.pulseClass
                )} />
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  alert.pulseClass
                )} />
              </span>
            )}
            
            <Icon className="h-3.5 w-3.5" />
            <span>{alert.label}</span>
            <span className={cn(
              "ml-1 px-1.5 py-0.5 text-xs rounded-full",
              isActive
                ? "bg-white/30 dark:bg-black/20"
                : "bg-muted"
            )}>
              {alert.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
