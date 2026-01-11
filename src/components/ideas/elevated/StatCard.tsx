// ============================================================
// STAT CARD - Linear/Vercel Inspired Stats
// ============================================================

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
  trend?: string;
  trendUp?: boolean;
  subtext?: string;
  suffix?: string;
  variant?: 'default' | 'blue' | 'teal' | 'green' | 'orange';
  showSparkline?: boolean;
}

const iconVariants = {
  default: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-600',
  teal: 'bg-teal-100 text-teal-600',
  green: 'bg-emerald-100 text-emerald-600',
  orange: 'bg-amber-100 text-amber-600',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  loading = false,
  trend,
  trendUp = true,
  subtext,
  suffix,
  variant = 'blue',
  showSparkline = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all duration-200">
      {/* Hover accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          iconVariants[variant]
        )}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[32px] font-bold text-slate-900 tracking-tight leading-none">
          {value}
        </span>
        {suffix && (
          <span className="text-lg text-slate-400 font-medium">{suffix}</span>
        )}
      </div>

      {(trend || subtext) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
              trendUp 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-red-100 text-red-700"
            )}>
              {trendUp ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend}
            </span>
          )}
          {subtext && (
            <span className="text-xs text-slate-400">{subtext}</span>
          )}
        </div>
      )}

      {showSparkline && (
        <div className="h-10 mt-3 bg-gradient-to-b from-blue-500/10 to-transparent rounded relative overflow-hidden">
          <div 
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            style={{ 
              clipPath: 'polygon(0 100%, 10% 60%, 25% 80%, 40% 40%, 55% 60%, 70% 20%, 85% 50%, 100% 10%, 100% 100%)' 
            }}
          />
        </div>
      )}
    </div>
  );
}
