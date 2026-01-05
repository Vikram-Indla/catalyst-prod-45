/**
 * Pass Rate Donut - Circular chart showing pass/fail/blocked/skipped distribution
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle2, XCircle, AlertTriangle, SkipForward } from 'lucide-react';
import type { ExecutionSummary } from '../../api/types';

interface PassRateDonutProps {
  data: ExecutionSummary;
  className?: string;
}

const COLORS = {
  passed: '#0d9488',
  failed: '#ef4444',
  blocked: '#f97316',
  skipped: '#a3a3a3',
};

export function PassRateDonut({ data, className }: PassRateDonutProps) {
  const chartData = [
    { name: 'Passed', value: data.passed_count, color: COLORS.passed },
    { name: 'Failed', value: data.failed_count, color: COLORS.failed },
    { name: 'Blocked', value: data.blocked_count, color: COLORS.blocked },
    { name: 'Skipped', value: data.skipped_count, color: COLORS.skipped },
  ].filter(d => d.value > 0);

  const passRate = data.pass_rate || 0;

  return (
    <div className={cn('bg-background border rounded-xl overflow-hidden', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="text-sm font-semibold text-foreground">Pass Rate</h3>
      </div>
      
      <div className="p-5 flex flex-col items-center">
        {/* Donut Chart */}
        <div className="relative w-44 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-teal-600">
              {passRate.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">Pass Rate</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-5 w-full">
          <StatItem 
            icon={CheckCircle2}
            label="Passed"
            value={data.passed_count}
            color="teal"
          />
          <StatItem 
            icon={XCircle}
            label="Failed"
            value={data.failed_count}
            color="red"
          />
          <StatItem 
            icon={AlertTriangle}
            label="Blocked"
            value={data.blocked_count}
            color="orange"
          />
          <StatItem 
            icon={SkipForward}
            label="Skipped"
            value={data.skipped_count}
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'teal' | 'red' | 'orange' | 'gray';
}

const colorClasses = {
  teal: 'bg-teal-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-400',
};

function StatItem({ icon: Icon, label, value, color }: StatItemProps) {
  return (
    <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
      <div className={cn('w-1 h-6 rounded-full', colorClasses[color])} />
      <div className="flex flex-col">
        <span className="text-base font-bold text-foreground">{value}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
