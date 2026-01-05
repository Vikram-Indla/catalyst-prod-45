/**
 * TMStatCard - Statistics card for Test Management dashboards
 */

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TMStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  href?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  subtitle?: string;
  className?: string;
}

export function TMStatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
  trend,
  subtitle,
  className,
}: TMStatCardProps) {
  const content = (
    <div 
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card p-4',
        'transition-all duration-200 hover:shadow-md hover:border-border-default',
        href && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              trend.direction === 'up' ? 'text-emerald-500' : 'text-red-500'
            )}>
              <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
              {trend.value}% vs last week
            </p>
          )}
        </div>
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
  
  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  
  return content;
}
