// Risk Donut Chart Component
// Source: Screenshot-RiskROAMReport
// Uses Blue + Teal Professional palette for data visualization

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

// Professional Palette - Blue + Teal + accents
export const PROFESSIONAL_PALETTE = {
  primary: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',     // Blue (Primary)
  success: '#0d9488',     // Teal (Success/Done)
  warning: 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))',     // Amber (Warning)
  danger: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',      // Red (Critical/Error)
  neutral: '#6b7280',     // Gray (Neutral)
};

// Array format for easy iteration in charts
export const CHART_COLORS = [
  'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',  // Blue - Primary
  '#0d9488',  // Teal - Success
  'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))',  // Amber - Warning
  'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',  // Red - Danger
  '#6b7280',  // Gray - Neutral
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