/**
 * StatStrip Component
 * Single-row KPI strip replacing SummaryCards (44px height)
 * Includes AI Insights badge trigger
 */

import { AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReleaseSummary } from '../types';

interface StatStripProps {
  summary: ReleaseSummary;
  activeFilter: string | null;
  onFilterClick: (filter: string) => void;
  aiInsightCount: number;
  onAIInsightClick: () => void;
}

interface StatItemProps {
  label: string;
  value: number;
  dotColor?: string;
  isActive: boolean;
  onClick: () => void;
}

function StatItem({ label, value, dotColor, isActive, onClick }: StatItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-5 py-2.5 border-r border-slate-200 last:border-r-0",
        "transition-colors duration-150 relative",
        isActive
          ? "bg-blue-50"
          : "hover:bg-slate-50"
      )}
    >
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
      )}
      {dotColor && (
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
      )}
      <span className="text-lg font-bold text-slate-900">{value}</span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </button>
  );
}

export function StatStrip({ summary, activeFilter, onFilterClick, aiInsightCount, onAIInsightClick }: StatStripProps) {
  const items = [
    { key: 'all', label: 'Total', value: summary.total },
    { key: 'planning', label: 'Planning', value: summary.byStatus.planning, dotColor: 'bg-slate-400' },
    { key: 'active', label: 'Active', value: summary.byStatus.in_progress + summary.byStatus.testing, dotColor: 'bg-blue-500' },
    { key: 'at_risk', label: 'At Risk', value: summary.byHealth.at_risk + summary.byHealth.critical, dotColor: 'bg-red-500' },
    { key: 'released', label: 'Released', value: summary.byStatus.released, dotColor: 'bg-emerald-500' },
  ];

  return (
    <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden mb-4" style={{ height: '44px' }}>
      {items.map((item) => (
        <StatItem
          key={item.key}
          label={item.label}
          value={item.value}
          dotColor={item.dotColor}
          isActive={activeFilter === item.key}
          onClick={() => onFilterClick(item.key)}
        />
      ))}
      
      {/* AI Insights Badge */}
      {aiInsightCount > 0 && (
        <button
          onClick={onAIInsightClick}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 transition-colors"
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
          <span className="text-xs font-medium text-red-600">AI Insights</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold text-red-600 bg-white border border-red-200 rounded-full min-w-[20px] text-center">
            {aiInsightCount}
          </span>
        </button>
      )}
    </div>
  );
}
