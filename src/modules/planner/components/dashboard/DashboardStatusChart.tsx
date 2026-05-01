// ============================================================
// DASHBOARD STATUS CHART - V9
// Donut chart showing task distribution by status
// ============================================================

import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { StatusDistribution } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardStatusChartProps {
  data: StatusDistribution[];
}

// Status color map using V9 tokens
const STATUS_COLORS: Record<string, string> = {
  backlog: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
  planned: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  progress: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))',
  review: '#8b5cf6',
  done: '#10b981',
};

export function DashboardStatusChart({ data }: DashboardStatusChartProps) {
  const navigate = useNavigate();
  
  const totalTasks = data.reduce((sum, s) => sum + s.task_count, 0);
  
  // Prepare chart data
  const chartData = data.map((status) => ({
    name: status.status_name,
    value: status.task_count,
    slug: status.status_slug,
    color: STATUS_COLORS[status.status_slug] || status.status_color,
    percentage: totalTasks > 0 
      ? Math.round((status.task_count / totalTasks) * 100) 
      : 0,
  }));

  // Empty state when no tasks
  if (totalTasks === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Status Distribution
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3">
            <span className="text-2xl font-mono font-bold text-slate-300 dark:text-slate-600">0</span>
          </div>
          <span className="text-sm">No tasks to display</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Status Distribution
        </h3>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {totalTasks} Total Tasks
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-40 h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/taskhub/boards?status=${entry.slug}`)}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                        <div className="font-medium">{data.name}</div>
                        <div className="text-slate-300">
                          {data.value} tasks ({data.percentage}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {totalTasks}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              tasks
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {chartData.map((status) => (
            <button
              key={status.slug}
              onClick={() => navigate(`/taskhub/boards?status=${status.slug}`)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 rounded-lg',
                'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
                'group text-left'
              )}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {status.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {status.value}
                </span>
                <span className="text-xs text-slate-400">
                  {status.percentage}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
