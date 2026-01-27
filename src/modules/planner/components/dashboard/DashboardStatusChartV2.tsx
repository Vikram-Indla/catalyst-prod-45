// ============================================================
// DASHBOARD STATUS CHART V2 - REDESIGN
// Per Audit: Larger donut, click to filter, brand colors
// Remove redundant center label, cleaner legend
// ============================================================

import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { StatusDistribution } from '../../types/planner-dashboard';
import { cn } from '@/lib/utils';

interface DashboardStatusChartV2Props {
  data: StatusDistribution[];
}

// Consistent status colors per audit
const STATUS_COLORS: Record<string, string> = {
  backlog: '#64748b',
  planned: '#3b82f6',
  progress: '#f59e0b',
  review: '#8b5cf6',
  done: '#10b981',
};

export function DashboardStatusChartV2({ data }: DashboardStatusChartV2Props) {
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

  // Empty state
  if (totalTasks === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Status Distribution
        </h3>
        <div className="flex items-center justify-center py-8 text-sm text-slate-400">
          <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <span className="text-xl font-mono font-bold text-slate-300 dark:text-slate-600">0</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Status Distribution
      </h3>

      <div className="flex items-center gap-4">
        {/* Donut Chart - Made larger per audit */}
        <div className="relative w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
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
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-md shadow-lg text-xs">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-slate-300">
                          {item.value} ({item.percentage}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center - Total count only, no "tasks" text per audit */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {totalTasks}
            </span>
          </div>
        </div>

        {/* Legend - Simplified per audit: "Backlog 7" (no percentage unless hovered) */}
        <div className="flex-1 space-y-1">
          {chartData.map((status) => (
            <button
              key={status.slug}
              onClick={() => navigate(`/planner/task-list?status=${status.slug}`)}
              className={cn(
                'flex items-center justify-between w-full px-2 py-1.5 rounded',
                'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
                'text-left group'
              )}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {status.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {status.value}
                </span>
                {/* Show percentage on hover per audit */}
                <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity w-8 text-right">
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
