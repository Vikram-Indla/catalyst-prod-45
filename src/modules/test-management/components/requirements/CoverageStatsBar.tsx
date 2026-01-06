// Coverage Stats Ring component
import React from 'react';
import { getCoverageColor, getCoverageColorClass, getCoverageBgClass } from '../../types/requirements';

interface CoverageRingProps {
  percentage: number;
  label: string;
  sublabel: string;
  size?: number;
}

export function CoverageRing({ percentage, label, sublabel, size = 48 }: CoverageRingProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colorLevel = getCoverageColor(percentage);
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={getCoverageBgClass(colorLevel)}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${getCoverageColorClass(colorLevel)}`}>
          {percentage}%
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{sublabel}</span>
      </div>
    </div>
  );
}

interface CoverageStatsBarProps {
  overallCoverage: number;
  totalRequirements: number;
  coveredRequirements: number;
  executionCoverage: number;
  totalTests: number;
  executedTests: number;
  passRate: number;
  passedTests: number;
  failedTests: number;
  uncoveredCount: number;
  partialCount?: number;
}

export function CoverageStatsBar({
  overallCoverage,
  totalRequirements,
  coveredRequirements,
  executionCoverage,
  totalTests,
  executedTests,
  passRate,
  passedTests,
  failedTests,
  uncoveredCount,
  partialCount = 0,
}: CoverageStatsBarProps) {
  return (
    <div className="flex items-center gap-6 px-8 py-4 bg-card border-b">
      <CoverageRing
        percentage={overallCoverage}
        label="Overall Coverage"
        sublabel={`${coveredRequirements} of ${totalRequirements} requirements`}
      />
      
      <div className="w-px h-10 bg-border" />
      
      <CoverageRing
        percentage={executionCoverage}
        label="Execution Coverage"
        sublabel={`${executedTests} of ${totalTests} test cases`}
      />
      
      <div className="w-px h-10 bg-border" />
      
      <CoverageRing
        percentage={passRate}
        label="Pass Rate"
        sublabel={`${passedTests} passed, ${failedTests} failed`}
      />
      
      <div className="w-px h-10 bg-border" />
      
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-bold text-destructive">{uncoveredCount}</span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Uncovered</span>
      </div>
      
      {partialCount > 0 && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-amber-500">{partialCount}</span>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Partial</span>
        </div>
      )}
    </div>
  );
}
