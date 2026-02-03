// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ CHECKOUT MODAL COMPONENT
// End-of-week checkout with item decisions - Reference design match
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useCheckoutT10Week } from '../../hooks';
import type { T10WeekRow, T10ItemWithAssignee, CheckoutDecision } from '../../types';

interface T10CheckoutModalProps {
  isOpen: boolean;
  week: T10WeekRow | null;
  items: T10ItemWithAssignee[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function T10CheckoutModal({ isOpen, week, items, onClose, onSuccess }: T10CheckoutModalProps) {
  const [decisions, setDecisions] = useState<Record<string, CheckoutDecision>>({});
  
  const checkoutWeek = useCheckoutT10Week();

  // Calculate completed and incomplete items
  const completedItems = useMemo(() => 
    items.filter(item => item.status === 'done'),
    [items]
  );

  const incompleteItems = useMemo(() => 
    items.filter(item => item.status === 'todo'),
    [items]
  );

  // Initialize decisions for all incomplete items when modal opens
  useEffect(() => {
    if (isOpen && incompleteItems.length > 0) {
      const initial: Record<string, CheckoutDecision> = {};
      incompleteItems.forEach(item => {
        initial[item.id] = 'carry'; // Default to carry
      });
      setDecisions(initial);
    }
  }, [isOpen, incompleteItems]);

  const summary = useMemo(() => {
    const resolved = Object.values(decisions).filter(d => d === 'resolved').length;
    const carry = Object.values(decisions).filter(d => d === 'carry').length;
    const remove = Object.values(decisions).filter(d => d === 'remove').length;
    return { resolved, carry, remove };
  }, [decisions]);

  const handleDecisionChange = (itemId: string, decision: CheckoutDecision) => {
    setDecisions(prev => ({ ...prev, [itemId]: decision }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!week) return;

    try {
      await checkoutWeek.mutateAsync(week.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to checkout week:', error);
    }
  };

  if (!isOpen || !week) return null;

  const weekRange = `${format(parseISO(week.week_start_date), 'MMM d')} – ${format(parseISO(week.week_end_date), 'MMM d, yyyy')}`;

  return (
    <div className="t10-checkout-backdrop" onClick={onClose}>
      <div className="t10-checkout-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="t10-checkout-modal__header">
          <h2 className="t10-checkout-modal__title">Checkout Week</h2>
          <p className="t10-checkout-modal__date">{weekRange}</p>
        </header>
        
        <form onSubmit={handleSubmit} className="t10-checkout-modal__form">
          {/* Scrollable Content */}
          <div className="t10-checkout-modal__content">
            {/* Stats Cards */}
            <div className="t10-checkout-stats">
              <div className="t10-checkout-stats__card">
                <span className="t10-checkout-stats__value t10-checkout-stats__value--completed">
                  {completedItems.length}
                </span>
                <span className="t10-checkout-stats__label">COMPLETED</span>
              </div>
              <div className="t10-checkout-stats__card">
                <span className="t10-checkout-stats__value t10-checkout-stats__value--remaining">
                  {incompleteItems.length}
                </span>
                <span className="t10-checkout-stats__label">REMAINING</span>
              </div>
              <div className="t10-checkout-stats__card">
                <span className="t10-checkout-stats__value t10-checkout-stats__value--total">
                  {items.length}
                </span>
                <span className="t10-checkout-stats__label">TOTAL</span>
              </div>
            </div>

            {/* Item Decision List */}
            {incompleteItems.length > 0 && (
              <div className="t10-checkout-section-label">
                Incomplete Items — Choose action for each:
              </div>
            )}
            
            <div className="t10-checkout-items">
              {incompleteItems.length === 0 ? (
                <div className="t10-checkout-items__empty">
                  <p>All items completed! Ready to checkout.</p>
                </div>
              ) : (
                incompleteItems.map((item) => (
                  <div key={item.id} className="t10-checkout-item-card">
                    <div className="t10-checkout-item-card__header">
                      <span className="t10-checkout-item-card__rank">{item.rank}</span>
                      <span className="t10-checkout-item-card__title">{item.title}</span>
                    </div>
                    
                    <div className="t10-checkout-item-card__options">
                      <label className="t10-checkout-radio">
                        <input
                          type="radio"
                          name={`decision-${item.id}`}
                          checked={decisions[item.id] === 'resolved'}
                          onChange={() => handleDecisionChange(item.id, 'resolved')}
                        />
                        <span className="t10-checkout-radio__circle"></span>
                        <span className="t10-checkout-radio__label">Mark Resolved</span>
                      </label>
                      
                      <label className="t10-checkout-radio">
                        <input
                          type="radio"
                          name={`decision-${item.id}`}
                          checked={decisions[item.id] === 'carry'}
                          onChange={() => handleDecisionChange(item.id, 'carry')}
                        />
                        <span className="t10-checkout-radio__circle"></span>
                        <span className="t10-checkout-radio__label">Carry to Next Week</span>
                      </label>
                      
                      <label className="t10-checkout-radio">
                        <input
                          type="radio"
                          name={`decision-${item.id}`}
                          checked={decisions[item.id] === 'remove'}
                          onChange={() => handleDecisionChange(item.id, 'remove')}
                        />
                        <span className="t10-checkout-radio__circle"></span>
                        <span className="t10-checkout-radio__label">Remove</span>
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary Bar */}
            {incompleteItems.length > 0 && (
              <div className="t10-checkout-summary-bar">
                <span className="t10-checkout-summary-bar__resolved">
                  {summary.resolved} will be resolved
                </span>
                <span className="t10-checkout-summary-bar__separator">·</span>
                <span className="t10-checkout-summary-bar__carry">
                  {summary.carry} will carry over
                </span>
                <span className="t10-checkout-summary-bar__separator">·</span>
                <span className="t10-checkout-summary-bar__remove">
                  {summary.remove} will be removed
                </span>
              </div>
            )}
          </div>

          {/* Footer Actions - Always visible */}
          <footer className="t10-checkout-modal__footer">
            <button 
              type="button" 
              className="t10-checkout-btn-cancel"
              onClick={onClose}
              disabled={checkoutWeek.isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="t10-checkout-btn-confirm"
              disabled={checkoutWeek.isPending}
            >
              {checkoutWeek.isPending ? (
                <>
                  <Loader2 className="t10-spinner" size={16} />
                  Processing...
                </>
              ) : (
                'Confirm Checkout'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default T10CheckoutModal;
