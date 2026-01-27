// ============================================================
// WORKSTREAMS SUMMARY BAR
// Top-level KPI strip for workstreams overview
// V9 GOD-TIER: Clickable cards with improved styling
// ============================================================

import { Layers, ListTodo, TrendingUp, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkstreamsSummary } from './types';
import { motion } from 'framer-motion';

interface WorkstreamsSummaryBarProps {
  summary: WorkstreamsSummary;
  onHealthClick?: (health: 'all' | 'healthy' | 'at-risk' | 'critical') => void;
  activeFilter?: 'all' | 'healthy' | 'at-risk' | 'critical';
}

export function WorkstreamsSummaryBar({ summary, onHealthClick, activeFilter = 'all' }: WorkstreamsSummaryBarProps) {
  const stats = [
    {
      key: 'all' as const,
      label: 'Total Workstreams',
      value: summary.totalWorkstreams,
      icon: Layers,
      color: '#3b82f6',
      clickable: true,
    },
    {
      key: 'all' as const,
      label: 'Total Tasks',
      value: summary.totalTasks,
      icon: ListTodo,
      color: '#6366f1',
      clickable: false,
    },
    {
      key: 'all' as const,
      label: 'Overall Progress',
      value: `${summary.overallProgress}%`,
      icon: TrendingUp,
      color: '#10b981',
      clickable: false,
    },
    {
      key: 'healthy' as const,
      label: 'Healthy',
      value: summary.healthyCount,
      icon: CheckCircle,
      color: '#10b981',
      clickable: true,
    },
    {
      key: 'at-risk' as const,
      label: 'At Risk',
      value: summary.atRiskCount,
      icon: AlertTriangle,
      color: '#f59e0b',
      clickable: true,
    },
    {
      key: 'critical' as const,
      label: 'Critical',
      value: summary.criticalCount,
      icon: AlertCircle,
      color: '#ef4444',
      clickable: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const isActive = stat.clickable && activeFilter === stat.key;
        const isClickable = stat.clickable && onHealthClick;
        
        return (
          <motion.div
            key={`${stat.label}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => isClickable && onHealthClick?.(stat.key)}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl',
              'bg-white dark:bg-slate-800/50',
              'border transition-all',
              isClickable ? 'cursor-pointer' : '',
              isActive
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700',
              isClickable && !isActive && 'hover:border-slate-300 dark:hover:border-slate-600'
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
