// ============================================================
// IDEAS HUB - METRIC CARD COMPONENT
// ============================================================

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface IdeasHubMetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  loading?: boolean;
  trend?: string;
  trendUp?: boolean;
  suffix?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export function IdeasHubMetricCard({
  title,
  value,
  icon: Icon,
  loading = false,
  trend,
  trendUp,
  suffix,
  variant = 'default',
}: IdeasHubMetricCardProps) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-semibold text-foreground">
                  {value}
                </span>
                {suffix && (
                  <span className="text-sm text-muted-foreground">{suffix}</span>
                )}
              </div>
            )}
            {trend && !loading && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-1",
                trendUp ? "text-emerald-600" : "text-red-600"
              )}>
                {trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            variantStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
