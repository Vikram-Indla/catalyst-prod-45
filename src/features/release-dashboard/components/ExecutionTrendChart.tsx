/**
 * Execution Trend 7-day bar chart
 */

import { motion } from 'framer-motion';
import type { ExecutionTrendData } from '../types';

interface ExecutionTrendChartProps {
  data: ExecutionTrendData[];
}

export function ExecutionTrendChart({ data }: ExecutionTrendChartProps) {
  const maxTotal = Math.max(...data.map(d => d.passed + d.failed + d.blocked));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-xl p-4"
    >
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Execution Trend (7 days)</h3>
      
      <div className="flex items-end justify-between h-32 gap-2">
        {data.map((day, i) => {
          const total = day.passed + day.failed + day.blocked;
          const height = (total / maxTotal) * 100;
          const passedH = (day.passed / total) * height;
          const failedH = (day.failed / total) * height;
          const blockedH = (day.blocked / total) * height;
          const dateLabel = new Date(day.date).getDate();

          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col-reverse" style={{ height: '100px' }}>
                <div className="w-full rounded-t" style={{ height: `${passedH}%`, backgroundColor: '#0d9488' }} />
                <div className="w-full" style={{ height: `${failedH}%`, backgroundColor: 'var(--ds-text-danger, #ef4444)' }} />
                <div className="w-full" style={{ height: `${blockedH}%`, backgroundColor: 'var(--ds-text-warning, #d97706)' }} />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">{dateLabel}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#0d9488]" />Passed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--ds-text-danger, #ef4444)]" />Failed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--ds-text-warning, #d97706)]" />Blocked</span>
      </div>
    </motion.div>
  );
}
