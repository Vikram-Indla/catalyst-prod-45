/**
 * Summary Cards Component
 * Shows totals by status and at-risk count
 */

import React from 'react';
import { Package, FileText, Play, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
      icon: <Package className="w-5 h-5 text-slate-600" />,
      color: 'bg-slate-100',
      onClick: () => onFilterByStatus?.('all'),
    },
    {
      label: 'Planning',
      value: summary.byStatus.planning,
      icon: <FileText className="w-5 h-5 text-slate-500" />,
      color: 'bg-slate-100',
      onClick: () => onFilterByStatus?.('planning'),
    },
    {
      label: 'Active',
      value: summary.byStatus.in_progress + summary.byStatus.testing,
      icon: <Play className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-100',
      onClick: () => onFilterByStatus?.('in_progress'),
    },
    {
      label: 'At Risk',
      value: summary.byHealth.at_risk + summary.byHealth.critical,
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      color: 'bg-orange-100',
      onClick: () => onFilterByHealth?.('at_risk'),
      isHighlighted: (summary.byHealth.at_risk + summary.byHealth.critical) > 0,
    },
    {
      label: 'Released',
      value: summary.byStatus.released,
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
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
