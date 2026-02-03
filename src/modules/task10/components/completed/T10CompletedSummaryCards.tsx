// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10CompletedSummaryCards
// Purpose: Summary stat cards at top of completed view
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { CheckCircle, TrendingUp, ArrowRight, XCircle } from 'lucide-react';
import { useT10CompletedSummary } from '../../hooks/useT10Completed';

export function T10CompletedSummaryCards() {
  const { data, isLoading, error } = useT10CompletedSummary();

  if (isLoading) {
    return (
      <div className="t10-summary-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="t10-summary-card">
            <div className="t10-skeleton t10-skeleton-value" />
            <div className="t10-skeleton t10-skeleton-label" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const cards = [
    { 
      value: data.total_weeks_completed, 
      label: 'Weeks Completed',
      icon: CheckCircle,
      iconColor: 'var(--t10-success)'
    },
    { 
      value: `${data.avg_completion_rate}%`, 
      label: 'Avg Completion',
      icon: TrendingUp,
      iconColor: 'var(--t10-accent)'
    },
    { 
      value: data.total_items_completed, 
      label: 'Items Completed',
      icon: CheckCircle,
      iconColor: 'var(--t10-success)'
    },
    { 
      value: data.total_carried_forward, 
      label: 'Carried Forward',
      icon: ArrowRight,
      iconColor: 'var(--t10-warning)'
    },
  ];

  return (
    <div className="t10-summary-grid">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="t10-summary-card">
            <div className="t10-summary-icon" style={{ color: card.iconColor }}>
              <Icon size={20} />
            </div>
            <div className="t10-summary-value">{card.value}</div>
            <div className="t10-summary-label">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default T10CompletedSummaryCards;
