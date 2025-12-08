// Risk Donut Chart Component
// Source: Screenshot-RiskROAMReport
// Uses Golden Hour secondary palette for data visualization

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

// Golden Hour Palette - USE THESE for all charts/graphs/reports
export const GOLDEN_HOUR_PALETTE = {
  expert: '#5c7c5c',      // Olive green (Level 5)
  advanced: '#8b7355',    // Bronze/brown (Level 4)
  intermediate: '#c69c6d', // Catalyst gold (Level 3)
  beginner: '#d4b896',    // Light champagne (Level 2)
  none: '#c8ccd0',        // Cool grey (Level 1)
};

// Array format for easy iteration in charts
export const GOLDEN_HOUR_COLORS = [
  '#5c7c5c',  // Expert - Olive
  '#8b7355',  // Advanced - Bronze
  '#c69c6d',  // Intermediate - Gold
  '#d4b896',  // Beginner - Champagne
  '#c8ccd0',  // None - Grey
];

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
