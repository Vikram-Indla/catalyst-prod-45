import { GadgetConfig } from '@/types/dashboard.types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PassRateTrendGadgetProps {
  config: GadgetConfig;
}

export function PassRateTrendGadget({ config }: PassRateTrendGadgetProps) {
  // Sample data for last 14 days
  const trendData = [
    { date: '2024-01-01', passRate: 72 },
    { date: '2024-01-02', passRate: 75 },
    { date: '2024-01-03', passRate: 68 },
    { date: '2024-01-04', passRate: 78 },
    { date: '2024-01-05', passRate: 82 },
    { date: '2024-01-06', passRate: 79 },
    { date: '2024-01-07', passRate: 85 },
    { date: '2024-01-08', passRate: 81 },
    { date: '2024-01-09', passRate: 88 },
    { date: '2024-01-10', passRate: 84 },
    { date: '2024-01-11', passRate: 86 },
    { date: '2024-01-12', passRate: 89 },
    { date: '2024-01-13', passRate: 87 },
    { date: '2024-01-14', passRate: 91 }
  ];

  const currentRate = trendData[trendData.length - 1]?.passRate || 0;
  const avgRate = Math.round(trendData.reduce((a, b) => a + b.passRate, 0) / trendData.length);
  const trend = 'up'; // Calculated from data

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-brand-gold">{currentRate}%</div>
          <div className="text-xs text-muted-foreground">Current Pass Rate</div>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10 }} 
            tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))', 
              border: '1px solid hsl(var(--border))' 
            }}
            labelFormatter={(v) => new Date(v).toLocaleDateString()}
          />
          <ReferenceLine y={avgRate} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="passRate" 
            stroke="hsl(var(--brand-gold))" 
            strokeWidth={2}
            dot={false}
            name="Pass Rate %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
