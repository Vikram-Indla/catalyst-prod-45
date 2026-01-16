/**
 * Attention Cards
 * Quick status indicators for overdue, due today, defects, incidents
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Flame, Clock, Bug, Zap } from 'lucide-react';
import type { TestScopeSummary } from '../types';

interface AttentionCardsProps {
  summary: TestScopeSummary;
  onCardClick: (type: 'overdue' | 'today' | 'defects' | 'incidents') => void;
}

interface AttentionCard {
  id: 'overdue' | 'today' | 'defects' | 'incidents';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
}

export function AttentionCards({ summary, onCardClick }: AttentionCardsProps) {
  const cards: AttentionCard[] = [
    {
      id: 'overdue',
      icon: Flame,
      label: 'Overdue',
      count: summary.overdueCount,
      colorClass: 'text-danger',
      bgClass: 'bg-danger/10 hover:bg-danger/20',
    },
    {
      id: 'today',
      icon: Clock,
      label: 'Due Today',
      count: summary.dueTodayCount,
      colorClass: 'text-warning',
      bgClass: 'bg-warning/10 hover:bg-warning/20',
    },
    {
      id: 'defects',
      icon: Bug,
      label: 'Defects',
      count: summary.linkedDefectsCount,
      colorClass: 'text-orange-500',
      bgClass: 'bg-orange-500/10 hover:bg-orange-500/20',
    },
    {
      id: 'incidents',
      icon: Zap,
      label: 'Incidents',
      count: summary.activeIncidentsCount,
      colorClass: 'text-purple-500',
      bgClass: 'bg-purple-500/10 hover:bg-purple-500/20',
    },
  ];

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-border overflow-x-auto">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => onCardClick(card.id)}
          disabled={card.count === 0}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium whitespace-nowrap',
            card.bgClass,
            card.count === 0 && 'opacity-50 cursor-not-allowed'
          )}
        >
          <card.icon className={cn('h-4 w-4', card.colorClass)} />
          <span className={card.colorClass}>{card.count}</span>
          <span className="text-muted-foreground">{card.label}</span>
        </button>
      ))}
    </div>
  );
}
