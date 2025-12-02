import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { GadgetConfig } from '@/types/dashboard.types';
import { Bug, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DefectSummaryGadgetProps {
  config: GadgetConfig;
}

export function DefectSummaryGadget({ config }: DefectSummaryGadgetProps) {
  // Sample data
  const data = {
    total: 45,
    open: 12,
    byStatus: [
      { name: 'Open', value: 12, color: 'hsl(0 84% 60%)' },
      { name: 'In Progress', value: 8, color: 'hsl(45 93% 47%)' },
      { name: 'Resolved', value: 18, color: 'hsl(142 76% 36%)' },
      { name: 'Closed', value: 7, color: 'hsl(var(--muted-foreground))' }
    ]
  };

  const chartData = data.byStatus.filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold text-brand-gold">{data.total}</div>
          <div className="text-xs text-muted-foreground">Total Defects</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-destructive/10">
          <div className="text-2xl font-bold text-destructive">{data.open}</div>
          <div className="text-xs text-muted-foreground">Open Defects</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
