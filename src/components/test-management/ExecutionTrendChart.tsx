import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutionTrend } from '@/types/reports.types';

interface ExecutionTrendChartProps {
  data: ExecutionTrend[];
}

export const ExecutionTrendChart: React.FC<ExecutionTrendChartProps> = ({ data }) => {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Execution Trend (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="passed" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Passed"
            />
            <Line 
              type="monotone" 
              dataKey="failed" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Failed"
            />
            <Line 
              type="monotone" 
              dataKey="notRun" 
              stroke="#6b7280" 
              strokeWidth={2}
              name="Not Run"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
