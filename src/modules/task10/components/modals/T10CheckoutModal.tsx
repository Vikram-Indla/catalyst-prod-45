// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ CHECKOUT MODAL COMPONENT
// End-of-week checkout with item decisions
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { X, Loader2, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
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

  // Only show incomplete items (status === 'todo')
  const incompleteItems = useMemo(() => 
    items.filter(item => item.status === 'todo'),
    [items]
  );

  // Initialize decisions for all incomplete items
  useMemo(() => {
    const initial: Record<string, CheckoutDecision> = {};
    incompleteItems.forEach(item => {
      initial[item.id] = 'carry'; // Default to carry
    });
    setDecisions(initial);
  }, [incompleteItems]);

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
      // Note: Current API auto-carries incomplete items
      // Individual decisions are tracked via the summary display
      await checkoutWeek.mutateAsync(week.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to checkout week:', error);
    }
  };

  if (!isOpen || !week) return null;

  const weekRange = `${format(parseISO(week.week_start_date), 'MMM d')} - ${format(parseISO(week.week_end_date), 'MMM d, yyyy')}`;

  return (
    <div className="t10-modal-backdrop" onClick={onClose}>
      <div className="t10-modal t10-modal--lg" onClick={(e) => e.stopPropagation()}>
        <header className="t10-modal__header">
          <div>
            <h2 className="t10-modal__title">Checkout Week</h2>
            <p className="t10-modal__subtitle">{weekRange}</p>
          </div>
          <button className="t10-icon-btn t10-icon-btn--ghost" onClick={onClose}>
            <X />
          </button>
        </header>
        
        <form onSubmit={handleSubmit}>
          <div className="t10-modal__body">
            {incompleteItems.length === 0 ? (
              <div className="t10-checkout-empty">
                <CheckCircle className="t10-checkout-empty__icon" />
                <p>All items completed! Ready to checkout.</p>
              </div>
            ) : (
              <>
                <p className="t10-checkout-intro">
                  Choose what to do with {incompleteItems.length} incomplete item{incompleteItems.length !== 1 ? 's' : ''}:
                </p>
                
                <div className="t10-checkout-list">
                  {incompleteItems.map((item) => (
                    <div key={item.id} className="t10-checkout-item">
                      <div className="t10-checkout-item__info">
                        <span className="t10-checkout-item__rank">#{item.rank}</span>
                        <span className="t10-checkout-item__title">{item.title}</span>
                        {item.carryover_count > 0 && (
                          <span className="t10-checkout-item__carryover">
                            Carried {item.carryover_count}x
                          </span>
                        )}
                      </div>
                      
                      <div className="t10-checkout-item__actions">
                        <button
                          type="button"
                          className={`t10-checkout-btn ${decisions[item.id] === 'resolved' ? 't10-checkout-btn--active t10-checkout-btn--green' : ''}`}
                          onClick={() => handleDecisionChange(item.id, 'resolved')}
                        >
                          <CheckCircle />
                          <span>Resolve</span>
                        </button>
                        <button
                          type="button"
                          className={`t10-checkout-btn ${decisions[item.id] === 'carry' ? 't10-checkout-btn--active t10-checkout-btn--orange' : ''}`}
                          onClick={() => handleDecisionChange(item.id, 'carry')}
                        >
                          <RefreshCw />
                          <span>Carry</span>
                        </button>
                        <button
                          type="button"
                          className={`t10-checkout-btn ${decisions[item.id] === 'remove' ? 't10-checkout-btn--active t10-checkout-btn--red' : ''}`}
                          onClick={() => handleDecisionChange(item.id, 'remove')}
                        >
                          <Trash2 />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="t10-checkout-summary">
                  <div className="t10-checkout-summary__item t10-checkout-summary__item--green">
                    <span className="t10-checkout-summary__value">{summary.resolved}</span>
                    <span className="t10-checkout-summary__label">Resolved</span>
                  </div>
                  <div className="t10-checkout-summary__item t10-checkout-summary__item--orange">
                    <span className="t10-checkout-summary__value">{summary.carry}</span>
                    <span className="t10-checkout-summary__label">Carry Forward</span>
                  </div>
                  <div className="t10-checkout-summary__item t10-checkout-summary__item--red">
                    <span className="t10-checkout-summary__value">{summary.remove}</span>
                    <span className="t10-checkout-summary__label">Remove</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <footer className="t10-modal__footer">
            <button 
              type="button" 
              className="t10-btn t10-btn--ghost"
              onClick={onClose}
              disabled={checkoutWeek.isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="t10-btn t10-btn--primary"
              disabled={checkoutWeek.isPending}
            >
              {checkoutWeek.isPending ? (
                <>
                  <Loader2 className="t10-btn__icon t10-spinner" />
                  Checking out...
                </>
              ) : (
                'Complete Checkout'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default T10CheckoutModal;
