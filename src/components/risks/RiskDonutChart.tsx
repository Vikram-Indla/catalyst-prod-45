// Risk Donut Chart Component
// Source: Screenshot-RiskROAMReport

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface RiskDonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  centerLabel?: string;
  centerValue?: number;
}

export function RiskDonutChart({ data, centerLabel, centerValue }: RiskDonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold text-text-primary">
            {centerValue ?? total}
          </div>
          <div className="text-xs text-text-muted">
            {centerLabel || 'total'}
          </div>
        </div>
      </div>
    </div>
  );
}
