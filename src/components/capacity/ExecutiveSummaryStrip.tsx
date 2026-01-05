/**
 * Executive Summary Strip - Bloomberg-Grade Stats Header
 * Displays key capacity metrics at a glance for executive scanning
 * 
 * CATALYST V5 DARK MODE COMPLIANT
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface SimpleAllocation {
  id: string;
  end_date?: string | null;
}

interface ExecutiveSummaryStripProps {
  resources: Array<{
    id: string;
    name: string;
    totalAllocation: number;
    contractEndDate?: string | null;
    department?: string;
    allocations?: SimpleAllocation[];
  }>;
  className?: string;
}

interface StatMetric {
  label: string;
  value: number | string;
  subLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function ExecutiveSummaryStrip({ resources, className }: ExecutiveSummaryStripProps) {
  const metrics = useMemo((): StatMetric[] => {
    const total = resources.length;
    const available = resources.filter(r => r.totalAllocation === 0).length;
    const atCapacity = resources.filter(r => r.totalAllocation >= 80 && r.totalAllocation <= 100).length;
    const overAllocated = resources.filter(r => r.totalAllocation > 100).length;
    const underAllocated = resources.filter(r => r.totalAllocation > 0 && r.totalAllocation < 80).length;
    
    // Calculate overall utilization
    const totalAllocPct = total > 0 
      ? Math.round(resources.reduce((sum, r) => sum + r.totalAllocation, 0) / total)
      : 0;
    
    // Calculate resources freeing up in next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const freeingSoon = resources.filter(r => {
      if (!r.allocations?.length) return false;
      return r.allocations.some(a => {
        const endDate = a.end_date ? new Date(a.end_date) : null;
        return endDate && endDate >= now && endDate <= thirtyDaysFromNow;
      });
    }).length;
    
    // Find top risk cluster (department with most over-allocated)
    const deptRisk = resources.reduce((acc, r) => {
      if (r.totalAllocation > 100 && r.department) {
        acc[r.department] = (acc[r.department] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topRiskDept = Object.entries(deptRisk).sort((a, b) => b[1] - a[1])[0];
    
    return [
      {
        label: 'Total Resources',
        value: total,
        icon: Users,
        variant: 'default',
      },
      {
        label: 'Available',
        value: available,
        subLabel: 'Ready to assign',
        icon: CheckCircle,
        variant: available > 0 ? 'success' : 'default',
      },
      {
        label: 'At Capacity',
        value: atCapacity,
        subLabel: '80-100%',
        icon: TrendingUp,
        variant: 'info',
      },
      {
        label: 'Over-Allocated',
        value: overAllocated,
        subLabel: '>100%',
        icon: AlertTriangle,
        variant: overAllocated > 0 ? 'danger' : 'default',
      },
      {
        label: 'Utilization',
        value: `${totalAllocPct}%`,
        subLabel: 'Average',
        icon: TrendingUp,
        variant: totalAllocPct > 100 ? 'danger' : totalAllocPct >= 80 ? 'success' : 'warning',
      },
      {
        label: 'Frees Up ≤30d',
        value: freeingSoon,
        subLabel: 'Capacity soon',
        icon: Calendar,
        variant: freeingSoon > 0 ? 'info' : 'default',
      },
      {
        label: 'Risk Cluster',
        value: topRiskDept ? topRiskDept[1] : 0,
        subLabel: topRiskDept ? topRiskDept[0] : 'None',
        icon: AlertCircle,
        variant: topRiskDept ? 'warning' : 'default',
      },
    ];
  }, [resources]);

  const variantStyles = {
    default: {
      bg: 'bg-muted/50 dark:bg-[var(--surface-3)]',
      text: 'text-foreground dark:text-[var(--text-primary)]',
      icon: 'text-muted-foreground dark:text-[var(--text-secondary)]',
    },
    success: {
      bg: 'bg-teal-50 dark:bg-teal-900/30',
      text: 'text-teal-700 dark:text-teal-300',
      icon: 'text-teal-600 dark:text-teal-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
    },
  };

  return (
    <div className={cn(
      "bg-card dark:bg-[var(--surface-0)] border border-border dark:border-[var(--border-subtle)] rounded-lg p-3",
      className
    )}>
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {metrics.map((metric) => {
          const styles = variantStyles[metric.variant];
          const Icon = metric.icon;
          
          return (
            <div
              key={metric.label}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md min-w-fit flex-1 max-w-[160px] transition-colors",
                styles.bg
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", styles.icon)} />
              <div className="min-w-0">
                <div className={cn("text-lg font-bold leading-none tabular-nums", styles.text)}>
                  {metric.value}
                </div>
                <div className="text-[10px] text-muted-foreground dark:text-[var(--text-secondary)] leading-tight truncate mt-0.5">
                  {metric.label}
                </div>
                {metric.subLabel && (
                  <div className="text-[9px] text-muted-foreground dark:text-[var(--muted-foreground)] truncate">
                    {metric.subLabel}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
