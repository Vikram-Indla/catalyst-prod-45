// ============================================================
// IDEAS STATS GRID - 4-Card Stats Row
// ============================================================

import { LucideIcon, Lightbulb, Zap, Star, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: number | string;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

interface IdeasStatsGridProps {
  totalIdeas: number;
  quickWinsReady: number;
  avgImpact: number;
  conversionRate: number;
  loading?: boolean;
}

export function IdeasStatsGrid({ 
  totalIdeas, 
  quickWinsReady, 
  avgImpact, 
  conversionRate,
  loading = false 
}: IdeasStatsGridProps) {
  const stats: StatItem[] = [
    {
      label: "TOTAL IDEAS",
      value: totalIdeas,
      trend: "+12%",
      trendUp: true,
      icon: Lightbulb,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      label: "QUICK WINS READY",
      value: quickWinsReady,
      trend: `${quickWinsReady} pending`,
      trendUp: true,
      icon: Zap,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    {
      label: "AVG IMPACT SCORE",
      value: avgImpact.toFixed(1),
      suffix: "/5",
      trend: "+0.3",
      trendUp: true,
      icon: Star,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600"
    },
    {
      label: "CONVERSION RATE",
      value: conversionRate,
      suffix: "%",
      trend: "+5%",
      trendUp: true,
      icon: TrendingUp,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-5">
            <Skeleton className="h-10 w-10 rounded-xl mb-4" />
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card 
          key={stat.label} 
          className="p-5 bg-white border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* Icon */}
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.iconBg)}>
            <stat.icon className={cn("w-5 h-5", stat.iconColor)} />
          </div>
          
          {/* Label */}
          <p className="text-[10px] font-semibold tracking-widest text-slate-400 mb-1">
            {stat.label}
          </p>
          
          {/* Value */}
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-bold text-slate-900">
              {stat.value}
            </span>
            {stat.suffix && (
              <span className="text-base font-medium text-slate-400">{stat.suffix}</span>
            )}
          </div>
          
          {/* Trend */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className={cn(
              "flex items-center gap-0.5 font-medium",
              stat.trendUp ? "text-emerald-600" : "text-red-500"
            )}>
              {stat.trendUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {stat.trend}
            </span>
            <span className="text-slate-400">vs last month</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
