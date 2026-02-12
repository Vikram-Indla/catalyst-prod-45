/**
 * Attention Cards
 * Quick status indicators for overdue, due today, defects, incidents
 * Styled to match dashboard: white bg, consistent borders
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
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  count: number;
  color: string;
  bg: string;
}

export function AttentionCards({ summary, onCardClick }: AttentionCardsProps) {
  const cards: AttentionCard[] = [
    { id: 'overdue', icon: Flame, label: 'Overdue', count: summary.overdueCount, color: '#DC2626', bg: '#FEF2F2' },
    { id: 'today', icon: Clock, label: 'Due Today', count: summary.dueTodayCount, color: '#D97706', bg: '#FFFBEB' },
    { id: 'defects', icon: Bug, label: 'Defects', count: summary.linkedDefectsCount, color: '#DC2626', bg: '#FEF2F2' },
    { id: 'incidents', icon: Zap, label: 'Incidents', count: summary.activeIncidentsCount, color: '#64748B', bg: '#F1F5F9' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 24px',
      borderBottom: '1px solid #E2E8F0',
      overflowX: 'auto',
      backgroundColor: '#FFFFFF',
      fontFamily: 'Inter, sans-serif',
    }}>
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => onCardClick(card.id)}
          disabled={card.count === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 9999,
            background: card.bg, border: 'none',
            fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
            cursor: card.count === 0 ? 'not-allowed' : 'pointer',
            opacity: card.count === 0 ? 0.5 : 1,
            transition: 'opacity 150ms',
          }}
        >
          <card.icon style={{ width: 14, height: 14, color: card.color }} />
          <span style={{ fontWeight: 700, color: card.color }}>{card.count}</span>
          <span style={{ color: '#64748B' }}>{card.label}</span>
        </button>
      ))}
    </div>
  );
}
