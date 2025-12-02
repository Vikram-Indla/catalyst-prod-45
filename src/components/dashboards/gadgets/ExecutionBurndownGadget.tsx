import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { GadgetConfig } from '@/types/dashboard.types';

interface ExecutionBurndownGadgetProps {
  config: GadgetConfig;
}

export function ExecutionBurndownGadget({ config }: ExecutionBurndownGadgetProps) {
  // Generate sample burndown data
  const totalDays = 14;
  const totalCases = 100;
  const dailyIdeal = totalCases / totalDays;

  const burndownData = [];
  let remaining = totalCases;

  for (let i = 0; i <= totalDays; i++) {
    // Simulate actual progress with some variance
    const dailyProgress = i === 0 ? 0 : Math.floor(Math.random() * 10) + 5;
    remaining = Math.max(0, remaining - dailyProgress);

    burndownData.push({
      day: `Day ${i + 1}`,
      remaining,
      ideal: Math.max(0, Math.round(totalCases - (dailyIdeal * i))),
      completed: totalCases - remaining
    });
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={burndownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))' 
          }} 
        />
        <Legend />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
        <Line 
          type="monotone" 
          dataKey="remaining" 
          stroke="hsl(var(--brand-gold))" 
          strokeWidth={2}
          name="Actual Remaining"
          dot={{ fill: 'hsl(var(--brand-gold))' }}
        />
        <Line 
          type="monotone" 
          dataKey="ideal" 
          stroke="hsl(var(--muted-foreground))" 
          strokeDasharray="5 5"
          name="Ideal Burndown"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
