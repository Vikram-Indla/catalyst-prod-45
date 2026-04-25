/**
 * Attention Cards
 * Quick status indicators for overdue, due today, defects, incidents
 */

import React from 'react';
import { Flame, Clock, Bug, Zap } from 'lucide-react';
import type { TestScopeSummary } from '../types';

interface AttentionCardsProps {
  summary: TestScopeSummary;
  onCardClick: (type: 'overdue' | 'today' | 'defects' | 'incidents') => void;
}

interface AttentionCard {
  id: 'overdue' | 'today' | 'defects' | 'incidents';
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  count: number;
  color: string;
  bgClass: string;
}

export function AttentionCards({ summary, onCardClick }: AttentionCardsProps) {
  const cards: AttentionCard[] = [
    { id: 'overdue', icon: Flame, label: 'Overdue', count: summary.overdueCount, color: '#DC2626', bgClass: 'bg-red-50 dark:bg-red-950/30' },
    { id: 'today', icon: Clock, label: 'Due Today', count: summary.dueTodayCount, color: '#D97706', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
    { id: 'defects', icon: Bug, label: 'Defects', count: summary.linkedDefectsCount, color: '#DC2626', bgClass: 'bg-red-50 dark:bg-red-950/30' },
    { id: 'incidents', icon: Zap, label: 'Incidents', count: summary.activeIncidentsCount, color: '#64748B', bgClass: 'bg-muted' },
  ];

  return (
    <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border overflow-x-auto bg-card font-body">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => onCardClick(card.id)}
          disabled={card.count === 0}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-none text-[13px] font-medium whitespace-nowrap transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${card.bgClass}`}
        >
          <card.icon style={{ width: 14, height: 14, color: card.color }} />
          <span style={{ fontWeight: 700, color: card.color }}>{card.count}</span>
          <span className="text-muted-foreground">{card.label}</span>
        </button>
      ))}
    </div>
  );
}
