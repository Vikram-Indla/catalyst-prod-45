/**
 * CycleKPICards - KPI cards row matching screenshot design
 * 5 cards: Total Cycles, In Progress, Completed, Pass Rate, Avg Duration
 */

import React from 'react';
import { Layers, PlayCircle, CheckCircle, TrendingUp, Clock, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { CycleKPIs } from '@/hooks/test-management/useTestCyclesEnhanced';

interface KPICardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success';
  subtext?: string;
  isLoading?: boolean;
}

function KPICard({ label, value, icon: Icon, variant = 'default', subtext, isLoading }: KPICardProps) {
  const iconContainerClass = cn(
    "w-10 h-10 rounded-lg flex items-center justify-center",
    variant === 'primary' && "bg-blue-50 text-blue-600",
    variant === 'success' && "bg-green-50 text-green-600",
    variant === 'default' && "bg-gray-100 text-gray-600"
  );

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-12 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={iconContainerClass}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

interface CycleKPICardsProps {
  kpis: CycleKPIs;
  isLoading?: boolean;
}

export function CycleKPICards({ kpis, isLoading }: CycleKPICardsProps) {
  // Calculate delta for pass rate (mock +3% for now - would need historical data)
  const passRateDelta = '+3% vs last month';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <KPICard 
        label="Total Cycles" 
        value={kpis.totalCycles.toString()} 
        icon={Layers}
        variant="default"
        isLoading={isLoading}
      />
      <KPICard 
        label="In Progress" 
        value={kpis.inProgressCount.toString()} 
        icon={PlayCircle}
        variant="primary"
        subtext="Currently active"
        isLoading={isLoading}
      />
      <KPICard 
        label="Completed" 
        value={kpis.completedCount.toString()} 
        icon={CheckCircle}
        variant="success"
        subtext="This month"
        isLoading={isLoading}
      />
      <KPICard 
        label="Pass Rate" 
        value={`${kpis.passRate}%`} 
        icon={TrendingUp}
        variant="success"
        subtext={passRateDelta}
        isLoading={isLoading}
      />
      <KPICard 
        label="Avg. Duration" 
        value={`${kpis.avgDurationHours} hrs`} 
        icon={Clock}
        variant="default"
        subtext="Per cycle"
        isLoading={isLoading}
      />
    </div>
  );
}

// Empty state for KPIs when no data
export function CycleKPICardsEmpty() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <KPICard label="Total Cycles" value="0" icon={Layers} variant="default" />
      <KPICard label="In Progress" value="0" icon={PlayCircle} variant="primary" subtext="Currently active" />
      <KPICard label="Completed" value="0" icon={CheckCircle} variant="success" subtext="This month" />
      <KPICard label="Pass Rate" value="0%" icon={TrendingUp} variant="success" subtext="-" />
      <KPICard label="Avg. Duration" value="- hrs" icon={Clock} variant="default" subtext="Per cycle" />
    </div>
  );
}
