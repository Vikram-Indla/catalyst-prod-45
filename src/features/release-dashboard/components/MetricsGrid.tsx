/**
 * Metrics Grid - 4 key metric cards
 */

import { motion } from 'framer-motion';
import { Package, TestTube2, RefreshCw, Bug, TrendingUp, TrendingDown } from 'lucide-react';
import type { ReleaseMetrics } from '../types';

interface MetricsGridProps {
  metrics: ReleaseMetrics;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const cards = [
    {
      label: 'Work Items',
      value: metrics.workItems.total,
      sub: `${metrics.workItems.complete} complete`,
      icon: Package,
      iconBg: 'var(--ds-background-selected, #eff6ff)',
      iconColor: 'var(--ds-text-brand, #2563eb)',
    },
    {
      label: 'Test Cases',
      value: metrics.testCases.total,
      trend: metrics.testCases.trend,
      icon: TestTube2,
      iconBg: '#ccfbf1',
      iconColor: '#0d9488',
    },
    {
      label: 'Test Cycles',
      value: metrics.testCycles.total,
      sub: `${metrics.testCycles.active} active`,
      icon: RefreshCw,
      iconBg: '#fef3c7',
      iconColor: 'var(--ds-text-warning, #d97706)',
    },
    {
      label: 'Open Defects',
      value: metrics.openDefects.total,
      trend: metrics.openDefects.trend,
      icon: Bug,
      iconBg: '#fee2e2',
      iconColor: 'var(--ds-text-danger, #ef4444)',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white border border-slate-200 rounded-xl p-4"
        >
          <div className="flex items-start justify-between">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: card.iconBg }}
            >
              <card.icon className="w-5 h-5" style={{ color: card.iconColor }} />
            </div>
            {card.trend && (
              <div className={`flex items-center text-xs ${card.trend.direction === 'up' ? 'text-[var(--ds-text-danger, #ef4444)]' : 'text-[#0d9488]'}`}>
                {card.trend.direction === 'up' ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {card.trend.value}
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <div className="text-xs text-slate-500">{card.sub || card.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
