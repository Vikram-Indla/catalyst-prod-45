import React from 'react';
import { Layers, PlayCircle, CheckCircle, TrendingUp, Clock, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success';
  subtext?: string;
}

function StatCard({ label, value, icon: Icon, variant = 'default', subtext }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          variant === 'primary' && "bg-blue-100 text-blue-600",
          variant === 'success' && "bg-green-100 text-green-600",
          variant === 'default' && "bg-gray-100 text-gray-600"
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

interface CycleStatsBarProps {
  totalCycles: number;
  inProgressCount: number;
  completedCount: number;
  passRate: number;
  avgDuration: string;
}

export function CycleStatsBar({ 
  totalCycles, 
  inProgressCount, 
  completedCount, 
  passRate, 
  avgDuration 
}: CycleStatsBarProps) {
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <StatCard 
        label="Total Cycles" 
        value={totalCycles.toString()} 
        icon={Layers}
        variant="default"
      />
      <StatCard 
        label="In Progress" 
        value={inProgressCount.toString()} 
        icon={PlayCircle}
        variant="primary"
        subtext="Currently active"
      />
      <StatCard 
        label="Completed" 
        value={completedCount.toString()} 
        icon={CheckCircle}
        variant="success"
        subtext="This month"
      />
      <StatCard 
        label="Pass Rate" 
        value={`${passRate}%`} 
        icon={TrendingUp}
        variant="success"
        subtext="+3% vs last month"
      />
      <StatCard 
        label="Avg. Duration" 
        value={avgDuration} 
        icon={Clock}
        variant="default"
        subtext="Per cycle"
      />
    </div>
  );
}
