// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ CHECKOUT MODAL COMPONENT
// End-of-week checkout with item decisions
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from 'react';
import { X, Loader2, CheckCircle, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
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
    items.filter(item => item.status === 'done' || item.status === 'resolved'),
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

  // Check for items carried multiple times
  const hasMultiCarryWarning = useMemo(() => {
    return incompleteItems.some(item => 
      item.carryover_count >= 2 && decisions[item.id] === 'carry'
    );
  }, [incompleteItems, decisions]);

  const handleDecisionChange = (itemId: string, decision: CheckoutDecision) => {
    setDecisions(prev => ({ ...prev, [itemId]: decision }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!week) return;

    try {
      await checkoutWeek.mutateAsync({
        weekId: week.id,
        decisions,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to checkout week:', error);
    }
  };

  if (!isOpen || !week) return null;

  const weekDateFormatted = format(parseISO(week.week_start_date), 'MMM d, yyyy');

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="flex items-start justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Checkout Week</h2>
              <p className="text-sm text-gray-500 mt-1">Week of {weekDateFormatted}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{completedItems.length}</div>
                  <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Completed</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{incompleteItems.length}</div>
                  <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">Remaining</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{items.length}</div>
                  <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total</div>
                </div>
              </div>

              {/* Items List */}
              {incompleteItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">All items completed!</h3>
                  <p className="text-sm text-gray-500">
                    Great work! All items in this week have been completed.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700 mb-4">
                    What would you like to do with the remaining items?
                  </p>

                  <div className="space-y-3">
                    {incompleteItems.map((item) => (
                      <div 
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        {/* Item Info */}
                        <div className="flex items-start gap-3 mb-3">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold flex items-center justify-center">
                            {item.rank}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 leading-tight">{item.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {item.taskhub_key && (
                                <span className="text-xs text-gray-500 font-mono">{item.taskhub_key}</span>
                              )}
                              {item.label && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                  {item.label}
                                </span>
                              )}
                              {item.carryover_count > 0 && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex items-center gap-1">
                                  <ArrowRight size={10} />
                                  Carried {item.carryover_count}x
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Selector */}
                        <div className="flex items-center gap-6 pl-10">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`decision-${item.id}`}
                              checked={decisions[item.id] === 'resolved'}
                              onChange={() => handleDecisionChange(item.id, 'resolved')}
                              className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700">Resolved</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`decision-${item.id}`}
                              checked={decisions[item.id] === 'carry'}
                              onChange={() => handleDecisionChange(item.id, 'carry')}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Carry Forward</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`decision-${item.id}`}
                              checked={decisions[item.id] === 'remove'}
                              onChange={() => handleDecisionChange(item.id, 'remove')}
                              className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700">Remove</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-200 p-6 bg-gray-50">
              {/* Summary */}
              {incompleteItems.length > 0 && (
                <div className="flex items-center gap-4 text-sm mb-4">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle size={14} />
                    {summary.resolved} resolved
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <ArrowRight size={14} />
                    {summary.carry} carry forward
                  </span>
                  <span className="flex items-center gap-1.5 text-red-600">
                    <Trash2 size={14} />
                    {summary.remove} removed
                  </span>
                </div>
              )}

              {/* Warning for items carried multiple times */}
              {hasMultiCarryWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Some items have been carried forward multiple times. Consider resolving or removing them.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={checkoutWeek.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutWeek.isPending}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {checkoutWeek.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Confirm Checkout
                    </>
                  )}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>
    </>
  );
}

export default T10CheckoutModal;
