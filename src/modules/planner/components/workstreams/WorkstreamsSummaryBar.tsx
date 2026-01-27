// ============================================================
// WORKSTREAMS SUMMARY BAR
// Top-level KPI strip for workstreams overview
// ============================================================

import { Layers, ListTodo, TrendingUp, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkstreamsSummary } from './types';
import { motion } from 'framer-motion';

interface WorkstreamsSummaryBarProps {
  summary: WorkstreamsSummary;
}

export function WorkstreamsSummaryBar({ summary }: WorkstreamsSummaryBarProps) {
  const stats = [
    {
      label: 'Total Workstreams',
      value: summary.totalWorkstreams,
      icon: Layers,
      color: '#3b82f6',
    },
    {
      label: 'Total Tasks',
      value: summary.totalTasks,
      icon: ListTodo,
      color: '#6366f1',
    },
    {
      label: 'Overall Progress',
      value: `${summary.overallProgress}%`,
      icon: TrendingUp,
      color: '#10b981',
    },
    {
      label: 'Healthy',
      value: summary.healthyCount,
      icon: CheckCircle,
      color: '#10b981',
    },
    {
      label: 'At Risk',
      value: summary.atRiskCount,
      icon: AlertTriangle,
      color: '#f59e0b',
    },
    {
      label: 'Critical',
      value: summary.criticalCount,
      icon: AlertCircle,
      color: '#ef4444',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl',
              'bg-white dark:bg-slate-800/50',
              'border border-slate-200 dark:border-slate-700'
            )}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}15` }}
            >
              <Icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {stat.label}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
