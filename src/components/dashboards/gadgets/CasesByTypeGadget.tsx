import { GadgetConfig } from '@/types/dashboard.types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

interface CasesByTypeGadgetProps {
  config: GadgetConfig;
}

const TYPE_COLORS: Record<string, string> = {
  Functional: 'hsl(var(--brand-gold))',
  Regression: 'hsl(217 91% 60%)',
  Smoke: 'hsl(142 76% 36%)',
  Integration: 'hsl(280 73% 57%)',
  Performance: 'hsl(25 95% 53%)',
  Security: 'hsl(0 84% 60%)'
};

export function CasesByTypeGadget({ config }: CasesByTypeGadgetProps) {
  // Sample data
  const chartData = [
    { name: 'Functional', value: 145, color: TYPE_COLORS.Functional },
    { name: 'Regression', value: 89, color: TYPE_COLORS.Regression },
    { name: 'Smoke', value: 34, color: TYPE_COLORS.Smoke },
    { name: 'Integration', value: 56, color: TYPE_COLORS.Integration },
    { name: 'Performance', value: 28, color: TYPE_COLORS.Performance },
    { name: 'Security', value: 18, color: TYPE_COLORS.Security }
  ];

  const total = chartData.reduce((a, b) => a + b.value, 0);
  const chartType = config.chartType || 'pie';

  if (chartType === 'bar') {
    return (
      <div className="space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          Total: {total} test cases
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
            <Tooltip />
            <Bar dataKey="value" name="Count">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-center text-sm text-muted-foreground">
        Total: {total} test cases
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={config.chartType === 'donut' ? 40 : 0}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
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
    </div>
  );
}
