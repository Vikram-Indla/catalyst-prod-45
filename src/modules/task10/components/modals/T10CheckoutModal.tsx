import React, { useState, useEffect } from 'react';
import { CheckCircle, RotateCcw, Trash2, Info, Check } from 'lucide-react';
import type { T10Item, T10CheckoutDecision } from '../../types';

interface T10CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekDate: string;
  items: T10Item[];
  completedCount: number;
  onCheckout: (decisions: T10CheckoutDecision[]) => void;
}

type DecisionType = 'resolved' | 'carry' | 'remove';

export function T10CheckoutModal({ 
  isOpen, 
  onClose, 
  weekDate, 
  items, 
  completedCount,
  onCheckout 
}: T10CheckoutModalProps) {
  const incompleteItems = items.filter(i => i.status === 'todo');
  const [decisions, setDecisions] = useState<Record<string, DecisionType>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset decisions when modal opens
  useEffect(() => {
    if (isOpen) {
      setDecisions(Object.fromEntries(incompleteItems.map(item => [item.id, 'carry' as DecisionType])));
      setShowSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const resolvedCount = Object.values(decisions).filter(d => d === 'resolved').length;
  const carryCount = Object.values(decisions).filter(d => d === 'carry').length;
  const removeCount = Object.values(decisions).filter(d => d === 'remove').length;

  const handleDecisionChange = (itemId: string, decision: DecisionType) => {
    setDecisions(prev => ({ ...prev, [itemId]: decision }));
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);
    
    const checkoutDecisions: T10CheckoutDecision[] = incompleteItems.map(item => ({
      itemId: item.id,
      rank: item.rank,
      title: item.title,
      decision: decisions[item.id] || 'carry'
    }));

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setShowSuccess(true);
    
    // Auto-close after success animation
    setTimeout(() => {
      onCheckout(checkoutDecisions);
      setShowSuccess(false);
    }, 1500);
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Success state
  if (showSuccess) {
    return (
      <div className={`t10-modal-overlay ${isOpen ? 'open' : ''}`}>
        <div className="t10-modal t10-checkout-modal" onClick={(e) => e.stopPropagation()}>
          <div className="t10-checkout-success">
            <div className="t10-checkout-success-icon">
              <Check size={32} />
            </div>
            <h3 className="t10-checkout-success-title">Week Checked Out!</h3>
            <p className="t10-checkout-success-subtitle">
              {carryCount > 0 && `${carryCount} item${carryCount > 1 ? 's' : ''} carried to next week`}
              {carryCount > 0 && resolvedCount > 0 && ' · '}
              {resolvedCount > 0 && `${resolvedCount} marked resolved`}
              {(carryCount > 0 || resolvedCount > 0) && removeCount > 0 && ' · '}
              {removeCount > 0 && `${removeCount} removed`}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        {incompleteItems.length > 0 ? (
          <>
            <div className="t10-checkout-section-header">
              <Info size={16} />
              <span>What would you like to do with remaining items?</span>
            </div>
            <div className="t10-checkout-items">
              {incompleteItems.map(item => (
                <div key={item.id} className="t10-checkout-item">
                  <div className="t10-checkout-item-header">
                    <div className="t10-checkout-item-rank">{item.rank}</div>
                    <div className="t10-checkout-item-info">
                      <div className="t10-checkout-item-title">{item.title}</div>
                      {item.taskhub_key && (
                        <span className="t10-checkout-item-key">{item.taskhub_key}</span>
                      )}
                    </div>
                  </div>
                  <div className="t10-checkout-options">
                    <button
                      className={`t10-checkout-option-btn ${decisions[item.id] === 'resolved' ? 'selected resolved' : ''}`}
                      onClick={() => handleDecisionChange(item.id, 'resolved')}
                    >
                      <CheckCircle size={16} />
                      <span>Resolved</span>
                    </button>
                    <button
                      className={`t10-checkout-option-btn ${decisions[item.id] === 'carry' ? 'selected carry' : ''}`}
                      onClick={() => handleDecisionChange(item.id, 'carry')}
                    >
                      <RotateCcw size={16} />
                      <span>Carry Over</span>
                    </button>
                    <button
                      className={`t10-checkout-option-btn ${decisions[item.id] === 'remove' ? 'selected remove' : ''}`}
                      onClick={() => handleDecisionChange(item.id, 'remove')}
                    >
                      <Trash2 size={16} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="t10-checkout-all-done">
            <CheckCircle size={40} />
            <h4>All items completed!</h4>
            <p>Great work this week. No remaining items to decide on.</p>
          </div>
        )}

        {/* Summary */}
        <div className="t10-checkout-summary">
          <div className="t10-checkout-summary-icon"><Info size={16} /></div>
          <div className="t10-checkout-summary-text">
            {incompleteItems.length > 0 ? (
              <>
                <strong>{resolvedCount}</strong> will be marked as resolved · 
                <strong> {carryCount}</strong> will carry to next week
                {carryCount > 0 && <span className="t10-checkout-summary-note"> (carryover count +1)</span>}
                {removeCount > 0 && <> · <strong>{removeCount}</strong> will be removed</>}
              </>
            ) : (
              'Ready to start a fresh week!'
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="t10-checkout-footer">
          <button 
            className="t10-btn t10-btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="t10-btn t10-btn-primary" 
            onClick={handleCheckout}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="t10-spinner" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Confirm Checkout
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
