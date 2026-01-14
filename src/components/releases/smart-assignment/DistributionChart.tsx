/**
 * Distribution Chart
 * Visual pie chart showing test distribution
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { getDistributionHealth } from '@/lib/assignment-algorithm';
import type { DistributionSummary } from '@/types/smart-assignment.types';

interface DistributionChartProps {
  distributionSummary: DistributionSummary[];
  distributionScore: number;
}

// Chart colors matching avatar colors
const CHART_COLORS = [
  CATALYST_V5.primary,
  CATALYST_V5.teal,
  CATALYST_V5.warning,
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

const HEALTH_COLORS = {
  teal: { bg: CATALYST_V5.tealLight, text: CATALYST_V5.teal },
  primary: { bg: CATALYST_V5.primaryLight, text: CATALYST_V5.primary },
  warning: { bg: CATALYST_V5.warningLight, text: CATALYST_V5.warning },
  danger: { bg: CATALYST_V5.dangerLight, text: CATALYST_V5.danger },
};

export function DistributionChart({
  distributionSummary,
  distributionScore,
}: DistributionChartProps) {
  const health = getDistributionHealth(distributionScore);
  const healthColors = HEALTH_COLORS[health.color];

  const chartData = distributionSummary
    .filter(d => d.proposedCount > 0)
    .map((d, index) => ({
      name: d.memberName,
      value: d.proposedCount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  const totalTests = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div 
      className="p-4 border-b"
      style={{ borderColor: CATALYST_V5.slate[200] }}
    >
      <h4 
        className="text-sm font-semibold mb-3"
        style={{ color: CATALYST_V5.slate[700] }}
      >
        Distribution Overview
      </h4>

      {chartData.length === 0 ? (
        <div 
          className="h-32 flex items-center justify-center rounded-lg"
          style={{ backgroundColor: CATALYST_V5.slate[50] }}
        >
          <p 
            className="text-sm"
            style={{ color: CATALYST_V5.slate[400] }}
          >
            No tests to distribute
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Pie Chart */}
          <div className="relative" style={{ width: 120, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} tests (${Math.round((value / totalTests) * 100)}%)`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${CATALYST_V5.slate[200]}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ pointerEvents: 'none' }}
            >
              <span 
                className="text-lg font-bold"
                style={{ color: CATALYST_V5.slate[800] }}
              >
                {totalTests}
              </span>
              <span 
                className="text-[10px]"
                style={{ color: CATALYST_V5.slate[500] }}
              >
                tests
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-1.5">
              {chartData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span 
                    className="text-xs flex-1 truncate"
                    style={{ color: CATALYST_V5.slate[600] }}
                  >
                    {entry.name}
                  </span>
                  <span 
                    className="text-xs font-medium"
                    style={{ color: CATALYST_V5.slate[700] }}
                  >
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Health Badge */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: CATALYST_V5.slate[100] }}>
              <div className="flex items-center gap-2">
                <span 
                  className="text-xs"
                  style={{ color: CATALYST_V5.slate[500] }}
                >
                  Balance:
                </span>
                <Badge
                  className="text-[10px]"
                  style={{
                    backgroundColor: healthColors.bg,
                    color: healthColors.text,
                  }}
                >
                  {health.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
