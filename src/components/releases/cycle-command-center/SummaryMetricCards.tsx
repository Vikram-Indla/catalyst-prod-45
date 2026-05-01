/**
 * Summary Metric Cards - 6 status cards
 */

import React from 'react';
import { 
  Layers, CheckCircle, XCircle, AlertTriangle, 
  PlayCircle, Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATALYST_V5, TEST_STATUS_COLORS } from '@/lib/catalyst-colors';
import type { CycleStats } from '@/hooks/test-cycles/useCycleDetails';

interface SummaryMetricCardsProps {
  stats: CycleStats;
  onStatusFilter: (status: string | null) => void;
}

interface MetricCard {
  key: string;
  label: string;
  value: number;
  percentage?: number;
  icon: React.ElementType;
  colorKey: 'slate' | 'teal' | 'danger' | 'warning' | 'primary';
  filterValue: string | null;
}

const getCardStyles = (colorKey: string) => {
  switch (colorKey) {
    case 'teal':
      return {
        iconBg: CATALYST_V5.tealLight,
        iconColor: CATALYST_V5.teal,
        valueColor: CATALYST_V5.teal,
        badgeBg: CATALYST_V5.tealLight,
        badgeColor: CATALYST_V5.teal,
      };
    case 'danger':
      return {
        iconBg: CATALYST_V5.dangerLight,
        iconColor: CATALYST_V5.danger,
        valueColor: CATALYST_V5.danger,
        badgeBg: CATALYST_V5.dangerLight,
        badgeColor: CATALYST_V5.danger,
      };
    case 'warning':
      return {
        iconBg: CATALYST_V5.warningLight,
        iconColor: CATALYST_V5.warning,
        valueColor: CATALYST_V5.warning,
        badgeBg: CATALYST_V5.warningLight,
        badgeColor: CATALYST_V5.warning,
      };
    case 'primary':
      return {
        iconBg: CATALYST_V5.primaryLight,
        iconColor: CATALYST_V5.primary,
        valueColor: CATALYST_V5.primary,
        badgeBg: CATALYST_V5.primaryLight,
        badgeColor: CATALYST_V5.primary,
      };
    default:
      return {
        iconBg: CATALYST_V5.slate[100],
        iconColor: CATALYST_V5.slate[600],
        valueColor: CATALYST_V5.slate[900],
        badgeBg: CATALYST_V5.slate[100],
        badgeColor: CATALYST_V5.slate[600],
      };
  }
};

export function SummaryMetricCards({ stats, onStatusFilter }: SummaryMetricCardsProps) {
  const metrics: MetricCard[] = [
    { 
      key: 'total',
      label: 'Total Tests', 
      value: stats.total, 
      icon: Layers, 
      colorKey: 'slate',
      filterValue: null
    },
    { 
      key: 'passed',
      label: 'Passed', 
      value: stats.passed, 
      percentage: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
      icon: CheckCircle, 
      colorKey: 'teal',
      filterValue: 'passed'
    },
    { 
      key: 'failed',
      label: 'Failed', 
      value: stats.failed, 
      percentage: stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0,
      icon: XCircle, 
      colorKey: 'danger',
      filterValue: 'failed'
    },
    { 
      key: 'blocked',
      label: 'Blocked', 
      value: stats.blocked, 
      percentage: stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0,
      icon: AlertTriangle, 
      colorKey: 'warning',
      filterValue: 'blocked'
    },
    { 
      key: 'inProgress',
      label: 'In Progress', 
      value: stats.inProgress, 
      percentage: stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0,
      icon: PlayCircle, 
      colorKey: 'primary',
      filterValue: 'in_progress'
    },
    { 
      key: 'pending',
      label: 'Pending', 
      value: stats.notStarted, 
      percentage: stats.total > 0 ? Math.round((stats.notStarted / stats.total) * 100) : 0,
      icon: Clock, 
      colorKey: 'slate',
      filterValue: 'not_started'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const styles = getCardStyles(metric.colorKey);
        
        return (
          <button
            key={metric.key}
            onClick={() => onStatusFilter(metric.filterValue)}
            className={cn(
              'bg-background rounded-xl border p-4 text-left transition-all',
              'hover:shadow-md hover:border-[var(--ds-text-brand, #2563eb)]/30 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-[var(--ds-text-brand, #2563eb)]/20'
            )}
          >
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: styles.iconBg }}
              >
                <Icon 
                  className="w-5 h-5" 
                  style={{ color: styles.iconColor }} 
                />
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="text-2xl font-bold"
                  style={{ color: styles.valueColor }}
                >
                  {metric.value}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {metric.label}
                </div>
              </div>
            </div>
            
            {metric.percentage !== undefined && (
              <div 
                className="mt-2 text-xs font-medium px-2 py-0.5 rounded-full inline-block"
                style={{ 
                  backgroundColor: styles.badgeBg,
                  color: styles.badgeColor
                }}
              >
                {metric.percentage}%
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
