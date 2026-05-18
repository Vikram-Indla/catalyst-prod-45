/**
 * Metrics Grid - 4 key metric cards
 */

import { motion } from 'framer-motion';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import BugIcon from '@atlaskit/icon/core/bug';
// No @atlaskit/icon equivalent — inline SVG
const PackageIcon = ({ size = 20, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const TestTube2Icon = ({ size = 20, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2" /><path d="M8.5 2h7" /><path d="M14.5 16h-5" />
  </svg>
);
const TrendingUpIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
  </svg>
);
const TrendingDownIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
  </svg>
);
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
      renderIcon: (color: string) => <PackageIcon size={20} color={color} />,
      iconBg: 'var(--ds-background-selected, #eff6ff)',
      iconColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
    },
    {
      label: 'Test Cases',
      value: metrics.testCases.total,
      trend: metrics.testCases.trend,
      renderIcon: (color: string) => <TestTube2Icon size={20} color={color} />,
      iconBg: '#ccfbf1',
      iconColor: '#0d9488',
    },
    {
      label: 'Test Cycles',
      value: metrics.testCycles.total,
      sub: `${metrics.testCycles.active} active`,
      renderIcon: (color: string) => <RefreshIcon label="" size="small" primaryColor={color} />,
      iconBg: '#fef3c7',
      iconColor: 'var(--ds-text-warning, #d97706)',
    },
    {
      label: 'Open Defects',
      value: metrics.openDefects.total,
      trend: metrics.openDefects.trend,
      renderIcon: (color: string) => <BugIcon label="" size="small" primaryColor={color} />,
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
              {card.renderIcon(card.iconColor)}
            </div>
            {card.trend && (
              <div className={`flex items-center text-xs ${card.trend.direction === 'up' ? 'text-[var(--ds-text-danger,#ef4444)]' : 'text-[#0d9488]'}`}>
                {card.trend.direction === 'up' ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
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
