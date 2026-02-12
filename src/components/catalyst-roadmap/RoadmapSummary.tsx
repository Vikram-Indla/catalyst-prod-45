/**
 * Roadmap Summary - KPI bar with health ring
 */

import React from 'react';
import { format } from 'date-fns';
import type { RoadmapMilestone } from '@/types/roadmap';

interface RoadmapSummaryProps {
  totalObjectives: number;
  onTrackCount: number;
  atRiskCount: number;
  blockedCount: number;
  healthPercent: number;
  nextMilestone: RoadmapMilestone | undefined;
}

export function RoadmapSummary({
  totalObjectives,
  onTrackCount,
  atRiskCount,
  blockedCount,
  healthPercent,
  nextMilestone,
}: RoadmapSummaryProps) {
  // SVG health ring calculations
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthPercent / 100) * circumference;
  
  // Health ring color: teal >= 70%, amber 40-69%, red < 40%
  const healthColor = healthPercent >= 70 
    ? '#0d9488' 
    : healthPercent >= 40 
    ? '#d97706' 
    : '#dc2626';

  return (
    <div className="h-[68px] px-5 flex items-center gap-8 bg-card border-b border-divider shrink-0">
      {/* Health Ring */}
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-border"
            />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke={healthColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-text-primary">
            {healthPercent}%
          </div>
        </div>
        <span className="text-[11px] text-text-muted">Overall Health</span>
      </div>

      {/* KPIs */}
      <div className="flex gap-6">
        <KPIItem value={totalObjectives} label="Total" />
        <KPIItem value={onTrackCount} label="On Track" variant="success" />
        <KPIItem value={atRiskCount} label="At Risk" variant="warning" />
        <KPIItem value={blockedCount} label="Blocked" variant="danger" />
      </div>

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="ml-auto flex items-center gap-2.5 px-3 py-2 bg-status-warning/10 rounded-lg">
          <div className="w-3.5 h-3.5 bg-status-warning rotate-45 rounded-sm shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] text-text-muted uppercase tracking-wide">Next Milestone</span>
            <span className="text-xs font-semibold text-text-primary">{nextMilestone.name}</span>
            <span className="text-[11px] font-medium text-status-warning">
              {format(new Date(nextMilestone.date), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function KPIItem({ 
  value, 
  label, 
  variant 
}: { 
  value: number; 
  label: string; 
  variant?: 'success' | 'warning' | 'danger';
}) {
  const colorClass = variant === 'success' 
    ? 'text-status-success' 
    : variant === 'warning' 
    ? 'text-status-warning' 
    : variant === 'danger' 
    ? 'text-status-danger' 
    : 'text-text-primary';

  return (
    <div className="flex flex-col">
      <span className={`text-xl font-bold leading-tight ${colorClass}`}>{value}</span>
      <span className="text-[10px] text-text-muted mt-0.5">{label}</span>
    </div>
  );
}
