// ============================================================
// DASHBOARD STATUS CHART V3 - Design Spec
// Donut with center total + right-side legend rows
// ============================================================

import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { StatusDistribution } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardStatusChartV2Props {
  data: StatusDistribution[];
}

// Status colors matching spec
const STATUS_COLORS: Record<string, string> = {
  backlog: '#64748b',    // slate
  planned: '#3b82f6',    // blue
  progress: '#f59e0b',   // amber
  review: '#a855f7',     // purple
  done: '#22c55e',       // green
};

const STATUS_ORDER = ['backlog', 'planned', 'progress', 'review', 'done'];

export function DashboardStatusChartV2({ data }: DashboardStatusChartV2Props) {
  const navigate = useNavigate();
  
  const totalTasks = data.reduce((sum, s) => sum + s.task_count, 0);
  
  // Sort and prepare chart data
  const chartData = STATUS_ORDER
    .map(slug => {
      const status = data.find(s => s.status_slug === slug);
      return status ? {
        name: status.status_name,
        value: status.task_count,
        slug: status.status_slug,
        color: STATUS_COLORS[status.status_slug] || status.status_color,
      } : null;
    })
    .filter(Boolean) as Array<{ name: string; value: number; slug: string; color: string }>;

  // Empty state
  if (totalTasks === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Status Distribution
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-300 dark:text-slate-600">0</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 self-start">
      {/* Header */}
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Status Distribution
      </h3>

      <div className="flex items-center gap-6">
        {/* Donut Chart with center total */}
        <div className="relative w-40 h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/planner/task-list?status=${entry.slug}`)}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center - Total count with "Total" label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-none">
              {totalTasks}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total
            </span>
          </div>
        </div>

        {/* Legend - Right side, clean rows */}
        <div className="flex-1 space-y-2">
          {chartData.map((status) => (
            <button
              key={status.slug}
              onClick={() => navigate(`/planner/task-list?status=${status.slug}`)}
              className={cn(
                'flex items-center justify-between w-full px-2 py-1.5 rounded-md',
                'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
                'text-left'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {status.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {status.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
