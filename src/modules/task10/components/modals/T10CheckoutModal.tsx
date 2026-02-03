import React, { useState } from 'react';
import type { T10Item, T10CheckoutDecision } from '../../types';

interface T10CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekDate: string;
  items: T10Item[];
  completedCount: number;
  onCheckout: (decisions: T10CheckoutDecision[]) => void;
}

export function T10CheckoutModal({ 
  isOpen, 
  onClose, 
  weekDate, 
  items, 
  completedCount,
  onCheckout 
}: T10CheckoutModalProps) {
  const incompleteItems = items.filter(i => i.status === 'todo');
  const [decisions, setDecisions] = useState<Record<string, 'resolved' | 'carry' | 'remove'>>(
    Object.fromEntries(incompleteItems.map(item => [item.id, 'carry']))
  );

  const resolvedCount = Object.values(decisions).filter(d => d === 'resolved').length;
  const carryCount = Object.values(decisions).filter(d => d === 'carry').length;
  const removeCount = Object.values(decisions).filter(d => d === 'remove').length;

  const handleDecisionChange = (itemId: string, decision: 'resolved' | 'carry' | 'remove') => {
    setDecisions(prev => ({ ...prev, [itemId]: decision }));
  };

  const handleCheckout = () => {
    const checkoutDecisions: T10CheckoutDecision[] = incompleteItems.map(item => ({
      itemId: item.id,
      rank: item.rank,
      title: item.title,
      decision: decisions[item.id] || 'carry'
    }));
    onCheckout(checkoutDecisions);
  };

  if (!isOpen) return null;

  return (
    <div className={`t10-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="t10-modal t10-checkout-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="t10-checkout-header">
          <h2 className="t10-checkout-title">Checkout Week</h2>
          <p className="t10-checkout-subtitle">{weekDate}</p>
        </div>

        {/* Stats */}
        <div className="t10-checkout-stats">
          <div className="t10-checkout-stat">
            <div className="t10-checkout-stat-value completed">{completedCount}</div>
            <div className="t10-checkout-stat-label">Completed</div>
          </div>
          <div className="t10-checkout-stat">
            <div className="t10-checkout-stat-value remaining">{incompleteItems.length}</div>
            <div className="t10-checkout-stat-label">Remaining</div>
          </div>
          <div className="t10-checkout-stat">
            <div className="t10-checkout-stat-value total">{items.length}</div>
            <div className="t10-checkout-stat-label">Total</div>
          </div>
        </div>

        {/* Items */}
        {incompleteItems.length > 0 && (
          <div className="t10-checkout-items">
            {incompleteItems.map(item => (
              <div key={item.id} className="t10-checkout-item">
                <div className="t10-checkout-item-header">
                  <div className="t10-checkout-item-rank">{item.rank}</div>
                  <div className="t10-checkout-item-title">{item.title}</div>
                </div>
                <div className="t10-checkout-options">
                  <label className={`t10-checkout-option ${decisions[item.id] === 'resolved' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`decision-${item.id}`}
                      checked={decisions[item.id] === 'resolved'}
                      onChange={() => handleDecisionChange(item.id, 'resolved')}
                    />
                    Mark Resolved
                  </label>
                  <label className={`t10-checkout-option ${decisions[item.id] === 'carry' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`decision-${item.id}`}
                      checked={decisions[item.id] === 'carry'}
                      onChange={() => handleDecisionChange(item.id, 'carry')}
                    />
                    Carry to Next Week
                  </label>
                  <label className={`t10-checkout-option ${decisions[item.id] === 'remove' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`decision-${item.id}`}
                      checked={decisions[item.id] === 'remove'}
                      onChange={() => handleDecisionChange(item.id, 'remove')}
                    />
                    Remove
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="t10-checkout-summary">
          {resolvedCount} will be resolved · {carryCount} will carry over · {removeCount} will be removed
        </div>

        {/* Footer */}
        <div className="t10-checkout-footer">
          <button className="t10-btn t10-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="t10-btn t10-btn-primary" onClick={handleCheckout}>
            Confirm Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
