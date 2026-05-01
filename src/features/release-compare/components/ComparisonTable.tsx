/**
 * Comparison Table Component
 * Main side-by-side comparison grid
 */

import React from 'react';
import { ComparedRelease } from '../types';
import { getProgressColor, getStatusLabel, CATALYST_COLORS } from '../utils/compareUtils';
import { HealthGauge } from './HealthGauge';
import { TestBreakdownGrid } from './TestBreakdownGrid';
import { DefectBreakdown } from './DefectBreakdown';
import { QualityGateBar } from './QualityGateBar';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ComparisonTableProps {
  releases: ComparedRelease[];
  winners: { [metric: string]: string };
}

export function ComparisonTable({ releases, winners }: ComparisonTableProps) {
  const metrics = [
    { key: 'header', label: '' },
    { key: 'health_score', label: 'Health Score', sublabel: 'Overall release health' },
    { key: 'test_progress', label: 'Test Progress', sublabel: 'Execution completion' },
    { key: 'pass_rate', label: 'Pass Rate', sublabel: 'Tests passed / executed' },
    { key: 'test_breakdown', label: 'Test Breakdown', sublabel: 'By execution status' },
    { key: 'defects', label: 'Open Defects', sublabel: 'By severity' },
    { key: 'quality_gates', label: 'Quality Gates', sublabel: 'Gates status' },
    { key: 'days_remaining', label: 'Days Remaining', sublabel: 'Until target date' },
    { key: 'work_items', label: 'Work Items', sublabel: 'Stories in release' },
  ];
  
  const renderCell = (release: ComparedRelease, metricKey: string) => {
    const isWinner = winners[metricKey] === release.id;
    
    switch (metricKey) {
      case 'header':
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{release.version}</span>
            <span className="text-xs text-slate-500 truncate max-w-[150px]">{release.name}</span>
            <span 
              className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block w-fit"
              style={{
                backgroundColor: release.status === 'testing' ? '#ccfbf1' : 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f1f5f9))',
                color: release.status === 'testing' ? '#0d9488' : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))'
              }}
            >
              {getStatusLabel(release.status)}
            </span>
          </div>
        );
        
      case 'health_score':
        return (
          <HealthGauge
            score={release.metrics.healthScore}
            level={release.metrics.healthLevel}
            trend={release.metrics.healthTrend}
            isWinner={isWinner}
          />
        );
        
      case 'test_progress': {
        const { executed, total, percentage } = release.metrics.testProgress;
        const color = getProgressColor(percentage);
        return (
          <div className="relative">
            {isWinner && (
              <div className="absolute -top-1 -right-1 text-lg" style={{ color: '#0d9488' }}>★</div>
            )}
            <div className="flex flex-col gap-1">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-sm font-medium" style={{ color }}>
                {percentage}% <span className="text-slate-400 text-xs">({executed}/{total})</span>
              </span>
            </div>
          </div>
        );
      }
        
      case 'pass_rate': {
        const { passed, executed, percentage } = release.metrics.passRate;
        const color = getProgressColor(percentage);
        return (
          <div className="relative">
            {isWinner && (
              <div className="absolute -top-1 -right-1 text-lg" style={{ color: '#0d9488' }}>★</div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-bold" style={{ color }}>{percentage}%</span>
              <span className="text-xs text-slate-400">{passed} of {executed}</span>
            </div>
          </div>
        );
      }
        
      case 'test_breakdown':
        return (
          <TestBreakdownGrid
            {...release.metrics.testBreakdown}
            isWinner={isWinner}
          />
        );
        
      case 'defects':
        return (
          <DefectBreakdown
            {...release.metrics.defects}
            isWinner={isWinner}
          />
        );
        
      case 'quality_gates':
        return (
          <QualityGateBar
            {...release.metrics.qualityGates}
            isWinner={isWinner}
          />
        );
        
      case 'days_remaining': {
        const days = release.daysRemaining;
        const isRisk = days < 7 && release.metrics.healthScore < 85;
        const isWarning = days < 14 && release.metrics.healthScore < 85;
        
        return (
          <div className="flex items-center gap-2">
            <span 
              className="text-xl font-bold"
              style={{ 
                color: isRisk ? 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))' : isWarning ? 'var(--ds-text-warning, var(--ds-text-warning, #d97706))' : 'var(--ds-text-subtle, var(--ds-text-subtle, #334155))'
              }}
            >
              {days}
            </span>
            {isRisk && <AlertCircle className="w-4 h-4" style={{ color: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))' }} />}
            {!isRisk && isWarning && <AlertTriangle className="w-4 h-4" style={{ color: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))' }} />}
            <span className="text-xs text-slate-400">
              {new Date(release.targetDate).toLocaleDateString()}
            </span>
          </div>
        );
      }
        
      case 'work_items': {
        const { total, complete, inProgress } = release.metrics.workItems;
        return (
          <div className="relative">
            {isWinner && (
              <div className="absolute -top-1 -right-1 text-lg" style={{ color: '#0d9488' }}>★</div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-700">{total} items</span>
              <span className="text-xs text-slate-400">
                {complete} done, {inProgress} in progress
              </span>
            </div>
          </div>
        );
      }
        
      default:
        return null;
    }
  };
  
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 border-b border-slate-200 w-[140px]">
              Metric
            </th>
            {releases.map((release) => (
              <th 
                key={release.id}
                className="text-left px-4 py-3 border-b border-slate-200 border-l"
              >
                {renderCell(release, 'header')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.slice(1).map((metric) => (
            <tr key={metric.key} className="hover:bg-slate-50/50">
              <td className="px-4 py-3 border-b border-slate-100">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                  <span className="text-xs text-slate-400">{metric.sublabel}</span>
                </div>
              </td>
              {releases.map((release) => (
                <td 
                  key={release.id}
                  className="px-4 py-3 border-b border-slate-100 border-l"
                >
                  {renderCell(release, metric.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Legend */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <span style={{ color: '#0d9488' }}>★</span> = Best in category
      </div>
    </div>
  );
}
