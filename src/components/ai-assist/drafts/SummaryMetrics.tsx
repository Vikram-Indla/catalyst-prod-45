import React from 'react';
import { FileText, FileCheck, BarChart3, Users, Rocket, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricItem {
  id: string;
  label: string;
  count: number;
  icon: LucideIcon;
  gradientClass: string;
}

interface SummaryMetricsProps {
  totalDrafts: number;
  draftCount: number;
  inProgressCount: number;
  reviewCount: number;
  publishedCount: number;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function SummaryMetrics({
  totalDrafts,
  draftCount,
  inProgressCount,
  reviewCount,
  publishedCount,
  activeFilter,
  onFilterChange,
}: SummaryMetricsProps) {
  const metrics: MetricItem[] = [
    { 
      id: 'all', 
      label: 'Total Drafts', 
      count: totalDrafts, 
      icon: FileText,
      gradientClass: 'from-slate-500 to-slate-600'
    },
    { 
      id: 'draft', 
      label: 'Drafts', 
      count: draftCount, 
      icon: FileCheck,
      gradientClass: 'from-gray-400 to-gray-500'
    },
    { 
      id: 'in_progress', 
      label: 'In Progress', 
      count: inProgressCount, 
      icon: BarChart3,
      gradientClass: 'from-primary to-primary/80'
    },
    { 
      id: 'review', 
      label: 'Review', 
      count: reviewCount, 
      icon: Users,
      gradientClass: 'from-[hsl(var(--warning))] to-[hsl(var(--warning))]/80'
    },
    { 
      id: 'published', 
      label: 'Published', 
      count: publishedCount, 
      icon: Rocket,
      gradientClass: 'from-[hsl(var(--success))] to-[hsl(var(--success))]/80'
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isActive = activeFilter === metric.id;
        
        return (
          <button
            key={metric.id}
            onClick={() => onFilterChange(metric.id)}
            className={cn(
              "relative p-4 rounded-xl transition-all duration-300 text-left group",
              isActive 
                ? `bg-gradient-to-br ${metric.gradientClass} text-white shadow-lg scale-[1.02]` 
                : "bg-card border border-border hover:border-primary/30 hover:shadow-md"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className={cn(
                  "text-2xl font-bold tracking-tight",
                  isActive ? "text-white" : "text-foreground"
                )}>
                  {metric.count}
                </div>
                <div className={cn(
                  "text-xs mt-1",
                  isActive ? "text-white/80" : "text-muted-foreground"
                )}>
                  {metric.label}
                </div>
              </div>
              <div className={cn(
                "p-2 rounded-lg",
                isActive ? "bg-white/20" : "bg-muted group-hover:bg-muted/80"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  isActive ? "text-white" : "text-muted-foreground"
                )} />
              </div>
            </div>
            
            {/* Active indicator */}
            {isActive && (
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-white rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
