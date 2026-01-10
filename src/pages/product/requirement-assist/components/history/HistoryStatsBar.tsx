import React from 'react';
import { Layers, CheckCircle, Edit2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusFilter } from './types';

interface StatCard {
  id: StatusFilter;
  label: string;
  count: number;
  icon: React.ReactNode;
  iconClass: string;
}

interface HistoryStatsBarProps {
  totalCount: number;
  publishedCount: number;
  draftCount: number;
  failedCount: number;
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

export function HistoryStatsBar({
  totalCount,
  publishedCount,
  draftCount,
  failedCount,
  activeFilter,
  onFilterChange,
}: HistoryStatsBarProps) {
  const stats: StatCard[] = [
    {
      id: 'all',
      label: 'Total Generations',
      count: totalCount,
      icon: <Layers className="w-4 h-4" />,
      iconClass: 'bg-[#2563eb]/10 text-[#2563eb]',
    },
    {
      id: 'published',
      label: 'Published',
      count: publishedCount,
      icon: <CheckCircle className="w-4 h-4" />,
      iconClass: 'bg-[#10b981]/10 text-[#10b981]',
    },
    {
      id: 'draft',
      label: 'Drafts',
      count: draftCount,
      icon: <Edit2 className="w-4 h-4" />,
      iconClass: 'bg-[#f59e0b]/10 text-[#f59e0b]',
    },
    {
      id: 'failed',
      label: 'Failed',
      count: failedCount,
      icon: <XCircle className="w-4 h-4" />,
      iconClass: 'bg-[#ef4444]/10 text-[#ef4444]',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 p-5">
      {stats.map((stat) => (
        <button
          key={stat.id}
          onClick={() => onFilterChange(stat.id)}
          className={cn(
            'bg-white border rounded-lg p-4 text-left transition-all cursor-pointer',
            'hover:border-[#2563eb] hover:shadow-sm',
            activeFilter === stat.id
              ? 'border-[#2563eb] bg-[#2563eb]/[0.04]'
              : 'border-[#e2e8f0]'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-[#64748b]">{stat.label}</span>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.iconClass)}>
              {stat.icon}
            </div>
          </div>
          <div className="text-[28px] font-bold text-[#0f172a]">{stat.count}</div>
        </button>
      ))}
    </div>
  );
}
