/**
 * Summary Cards Component
 * Shows totals by status and at-risk count
 */

import React from 'react';
import FileIcon from '@atlaskit/icon/core/file';
import WarningIcon from '@atlaskit/icon/core/warning';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
// No @atlaskit/icon equivalent — inline SVG
const PackageIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const PlayIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
import { cn } from '@/lib/utils';
import { ReleaseSummary } from '../types';

interface SummaryCardsProps {
  summary: ReleaseSummary;
  onFilterByStatus?: (status: string) => void;
  onFilterByHealth?: (health: string) => void;
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  isHighlighted?: boolean;
}

function SummaryCard({ label, value, icon, color, onClick, isHighlighted }: SummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border transition-all",
        "hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/20",
        isHighlighted ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
      )}
    >
      <div className={cn("p-2 rounded-lg mb-2", color)}>
        {icon}
      </div>
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </button>
  );
}

export function SummaryCards({ summary, onFilterByStatus, onFilterByHealth }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Total',
      value: summary.total,
      icon: <PackageIcon size={20} />,
      color: 'bg-slate-100',
      onClick: () => onFilterByStatus?.('all'),
    },
    {
      label: 'Planning',
      value: summary.byStatus.planning,
      icon: <FileIcon label="" size="small" primaryColor="currentColor" />,
      color: 'bg-slate-100',
      onClick: () => onFilterByStatus?.('planning'),
    },
    {
      label: 'Active',
      value: summary.byStatus.in_progress + summary.byStatus.testing,
      icon: <PlayIcon size={20} />,
      color: 'bg-blue-100',
      onClick: () => onFilterByStatus?.('in_progress'),
    },
    {
      label: 'At Risk',
      value: summary.byHealth.at_risk + summary.byHealth.critical,
      icon: <WarningIcon label="" size="small" primaryColor="currentColor" />,
      color: 'bg-orange-100',
      onClick: () => onFilterByHealth?.('at_risk'),
      isHighlighted: (summary.byHealth.at_risk + summary.byHealth.critical) > 0,
    },
    {
      label: 'Released',
      value: summary.byStatus.released,
      icon: <CheckCircleIcon label="" size="small" primaryColor="currentColor" />,
      color: 'bg-green-100',
      onClick: () => onFilterByStatus?.('released'),
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
