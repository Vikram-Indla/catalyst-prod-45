/**
 * Activity Feed
 */

import { motion } from 'framer-motion';
import { CheckCircle2, Bug, AlertTriangle, Package } from 'lucide-react';
import type { ActivityItem } from '../types';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const typeConfig = {
  test: { icon: CheckCircle2, bg: '#ccfbf1', color: '#0d9488' },
  defect: { icon: Bug, bg: '#fee2e2', color: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))' },
  gate: { icon: AlertTriangle, bg: '#fef3c7', color: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))' },
  release: { icon: Package, bg: 'var(--ds-background-selected, var(--ds-background-selected, #eff6ff))', color: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))' },
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-xl p-4"
    >
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => {
          const config = typeConfig[activity.type];
          const Icon = config.icon;
          return (
            <div key={activity.id} className="flex items-start gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: config.bg }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{activity.message}</p>
                <p className="text-xs text-slate-400">{activity.relativeTime}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
