import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RadarChartDataPoint {
  metric: string;
  userValue: number;
  teamAvg: number;
}

interface RadarChartProps {
  data: RadarChartDataPoint[];
  userLabel?: string;
  teamLabel?: string;
}

export function RadarChart({ 
  data, 
  userLabel = 'You', 
  teamLabel = 'Team Avg' 
}: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadar data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis 
          dataKey="metric" 
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={30} 
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        />
        <Radar
          name={userLabel}
          dataKey="userValue"
          stroke="#c69c6d"
          fill="#c69c6d"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Radar
          name={teamLabel}
          dataKey="teamAvg"
          stroke="#6b7280"
          fill="#6b7280"
          fillOpacity={0.1}
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        <Legend />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
