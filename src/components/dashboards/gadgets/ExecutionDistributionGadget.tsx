import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { GadgetConfig } from '@/types/dashboard.types';

interface ExecutionDistributionGadgetProps {
  config: GadgetConfig;
}

const STATUS_COLORS: Record<string, string> = {
  passed: '#10b981',
  failed: '#ef4444',
  blocked: '#f59e0b',
  skipped: '#3b82f6',
  not_executed: '#6b7280',
  in_progress: '#eab308',
};

export function ExecutionDistributionGadget({ config }: ExecutionDistributionGadgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['execution-distribution', config.cycleId, config.projectId],
    queryFn: async () => {
      let query = supabase.from('test_executions').select('status');
      
      if (config.cycleId) {
        query = query.eq('test_cycle_id', config.cycleId);
      } else if (config.projectId) {
        query = query.eq('program_id', config.projectId);
      }

      const { data: executions, error } = await query;
      if (error) throw error;

      // Count by status
      const statusCounts: Record<string, number> = {};
      executions?.forEach(e => {
        const status = e.status || 'not_executed';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
        color: STATUS_COLORS[status] || '#6b7280',
      }));
    },
  });

  if (isLoading) {
    return <div className="h-full flex items-center justify-center animate-pulse"><div className="w-32 h-32 rounded-full bg-muted" /></div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">No execution data</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const chartType = config.chartType || 'donut';

  if (chartType === 'bar') {
    return (
      <div className="p-4 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" name="Count">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={chartType === 'donut' ? 40 : 0}
            outerRadius={70}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
          {chartType === 'donut' && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold">
              {total}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
