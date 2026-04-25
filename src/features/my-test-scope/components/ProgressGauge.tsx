/**
 * Progress Gauge Component
 * Circular progress indicator with status breakdown
 */

import React from 'react';
import { CheckCircle2, XCircle, Ban, Circle } from 'lucide-react';
import type { TestScopeSummary } from '../types';

interface ProgressGaugeProps {
  summary: TestScopeSummary;
}

export function ProgressGauge({ summary }: ProgressGaugeProps) {
  const { totalTests, passedTests, failedTests, blockedTests, notRunTests, passRate } = summary;
  
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (passRate / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-5 bg-card border border-border rounded-lg">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" className="stroke-muted" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke="#10B981" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeOffset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-bold text-foreground font-body">{passRate}%</span>
          <span className="text-xs text-muted-foreground font-body">{passedTests}/{totalTests}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4 w-full">
        <StatusItem icon={CheckCircle2} count={passedTests} label="Passed" color="#10B981" />
        <StatusItem icon={XCircle} count={failedTests} label="Failed" color="#EF4444" />
        <StatusItem icon={Ban} count={blockedTests} label="Blocked" color="#F59E0B" />
        <StatusItem icon={Circle} count={notRunTests} label="Not Run" color="#94A3B8" />
      </div>
    </div>
  );
}

function StatusItem({ icon: Icon, count, label, color }: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        <Icon style={{ width: 14, height: 14, color }} />
        <span className="font-semibold text-foreground text-sm font-body">{count}</span>
      </div>
      <span className="text-[11px] text-muted-foreground font-body">{label}</span>
    </div>
  );
}
