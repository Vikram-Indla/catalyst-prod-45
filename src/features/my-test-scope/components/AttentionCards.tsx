/**
 * Attention Cards
 * Quick status indicators for overdue, due today, defects, incidents
 */

import React from 'react';
import BugIcon from '@atlaskit/icon/core/bug';
import ClockIcon from '@atlaskit/icon/core/clock';
// No @atlaskit/icon equivalent — inline SVG
const FlameIcon = ({ size = 14, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const ZapIcon = ({ size = 14, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);
import type { TestScopeSummary } from '../types';

interface AttentionCardsProps {
  summary: TestScopeSummary;
  onCardClick: (type: 'overdue' | 'today' | 'defects' | 'incidents') => void;
}

interface AttentionCard {
  id: 'overdue' | 'today' | 'defects' | 'incidents';
  renderIcon: (color: string) => React.ReactNode;
  label: string;
  count: number;
  color: string;
  bgClass: string;
}

export function AttentionCards({ summary, onCardClick }: AttentionCardsProps) {
  const cards: AttentionCard[] = [
    { id: 'overdue', renderIcon: (color) => <FlameIcon size={14} color={color} />, label: 'Overdue', count: summary.overdueCount, color: 'var(--ds-text-danger, var(--cp-danger, #DC2626))', bgClass: 'bg-red-50 dark:bg-red-950/30' },
    { id: 'today', renderIcon: (color) => <ClockIcon label="" size="small" primaryColor={color} />, label: 'Due Today', count: summary.dueTodayCount, color: 'var(--ds-text-warning, var(--cp-warning, #D97706))', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
    { id: 'defects', renderIcon: (color) => <BugIcon label="" size="small" primaryColor={color} />, label: 'Defects', count: summary.linkedDefectsCount, color: 'var(--ds-text-danger, var(--cp-danger, #DC2626))', bgClass: 'bg-red-50 dark:bg-red-950/30' },
    { id: 'incidents', renderIcon: (color) => <ZapIcon size={14} color={color} />, label: 'Incidents', count: summary.activeIncidentsCount, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))', bgClass: 'bg-muted' },
  ];

  return (
    <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border overflow-x-auto bg-card font-['Inter']">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => onCardClick(card.id)}
          disabled={card.count === 0}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-none text-[13px] font-medium whitespace-nowrap transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${card.bgClass}`}
        >
          {card.renderIcon(card.color)}
          <span style={{ fontWeight: 700, color: card.color }}>{card.count}</span>
          <span className="text-muted-foreground">{card.label}</span>
        </button>
      ))}
    </div>
  );
}
