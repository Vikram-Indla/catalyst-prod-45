// ============================================================
// WORKSTREAMS V10 SUMMARY BAR
// KPI cards with clickable health filters
// ============================================================

import { Layers, ListTodo, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { WorkstreamsSummaryV10, HealthFilter } from './types';

interface SummaryBarProps {
  summary: WorkstreamsSummaryV10;
  activeFilter: HealthFilter;
  onFilterChange: (filter: HealthFilter) => void;
  isLoading?: boolean;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: typeof Layers;
  color: string;
  isActive: boolean;
  isClickable: boolean;
  onClick?: () => void;
  index: number;
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  isActive, 
  isClickable, 
  onClick, 
  index 
}: StatCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl text-left w-full',
        'bg-white dark:bg-slate-800/50',
        'border transition-all duration-200',
        isClickable ? 'cursor-pointer' : 'cursor-default',
        isActive
          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700',
        isClickable && !isActive && 'hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
      )}
      role={isClickable ? 'button' : 'status'}
      aria-pressed={isClickable ? isActive : undefined}
      aria-label={`${label}: ${value}${isClickable ? '. Click to filter.' : ''}`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color }} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
          {value}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium truncate">
          {label}
        </div>
      </div>
    </motion.button>
  );
}

export function SummaryBar({ summary, activeFilter, onFilterChange, isLoading }: SummaryBarProps) {
  const stats = [
    {
      key: 'all' as HealthFilter,
      label: 'Workstreams',
      value: summary.totalWorkstreams,
      icon: Layers,
      color: '#3b82f6',
      clickable: true,
    },
    {
      key: 'all' as HealthFilter,
      label: 'Tasks',
      value: summary.totalTasks,
      icon: ListTodo,
      color: '#6366f1',
      clickable: false,
    },
    {
      key: 'healthy' as HealthFilter,
      label: 'On Track',
      value: summary.healthyCount,
      icon: CheckCircle,
      color: '#10b981',
      clickable: true,
    },
    {
      key: 'at-risk' as HealthFilter,
      label: 'At Risk',
      value: summary.atRiskCount,
      icon: AlertTriangle,
      color: '#f59e0b',
      clickable: true,
    },
    {
      key: 'critical' as HealthFilter,
      label: 'Critical',
      value: summary.criticalCount,
      icon: AlertCircle,
      color: '#ef4444',
      clickable: true,
    },
  ];

  return (
    <div 
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
      role="group"
      aria-label="Workstream summary statistics"
    >
      {stats.map((stat, index) => (
        <StatCard
          key={`${stat.label}-${index}`}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          isActive={stat.clickable && activeFilter === stat.key}
          isClickable={stat.clickable}
          onClick={stat.clickable ? () => onFilterChange(stat.key) : undefined}
          index={index}
        />
      ))}
    </div>
  );
}
