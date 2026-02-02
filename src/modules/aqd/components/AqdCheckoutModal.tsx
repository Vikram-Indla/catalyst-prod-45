/**
 * AqdCheckoutModal - Modal for week checkout decisions
 */

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AqdItem } from '@/modules/aqd/types/aqd.types';
import type { CheckoutDecision, ItemDecision } from '@/modules/aqd/hooks/useAqdCheckout';

interface AqdCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AqdItem[];
  weekId: string;
  onCheckout: (decisions: ItemDecision[]) => void;
  isLoading?: boolean;
}

const DECISION_OPTIONS: { value: CheckoutDecision; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'resolved', 
    label: 'Resolved', 
    icon: <CheckCircle size={14} />,
    description: 'Mark as done',
  },
  { 
    value: 'carry', 
    label: 'Carry', 
    icon: <ArrowRight size={14} />,
    description: 'Move to next week',
  },
  { 
    value: 'leave', 
    label: 'Leave', 
    icon: <Pause size={14} />,
    description: 'Keep in backlog',
  },
];

export function AqdCheckoutModal({
  open,
  onOpenChange,
  items,
  weekId,
  onCheckout,
  isLoading = false,
}: AqdCheckoutModalProps) {
  // Filter to only show incomplete items
  const incompleteItems = useMemo(() => 
    items.filter(item => item.status !== 'completed'),
    [items]
  );

  // Initialize decisions based on item status
  const [decisions, setDecisions] = useState<Record<string, CheckoutDecision>>(() => {
    const initial: Record<string, CheckoutDecision> = {};
    incompleteItems.forEach(item => {
      // Default: in_progress -> carry, not_started -> leave
      initial[item.id] = item.status === 'in_progress' ? 'carry' : 'leave';
    });
    return initial;
  });

  const handleDecisionChange = (itemId: string, decision: CheckoutDecision) => {
    setDecisions(prev => ({ ...prev, [itemId]: decision }));
  };

  const handleConfirm = () => {
    const itemDecisions: ItemDecision[] = incompleteItems.map(item => ({
      item_id: item.id,
      decision: decisions[item.id] || 'leave',
    }));
    onCheckout(itemDecisions);
  };

  // Count decisions
  const counts = useMemo(() => {
    return Object.values(decisions).reduce(
      (acc, d) => {
        acc[d]++;
        return acc;
      },
      { resolved: 0, carry: 0, leave: 0 } as Record<CheckoutDecision, number>
    );
  }, [decisions]);

  // Count completed items
  const completedCount = items.filter(i => i.status === 'completed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="text-amber-500" size={20} />
            Checkout Week
          </DialogTitle>
        </DialogHeader>

        {/* Summary Banner */}
        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">{completedCount} completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span className="text-slate-600">{incompleteItems.length} need decisions</span>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {incompleteItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              All items are completed! Ready to checkout.
            </div>
          ) : (
            incompleteItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg"
              >
                {/* Rank Badge */}
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0",
                  item.rank <= 3 
                    ? item.rank === 1 ? "bg-amber-100 text-amber-700"
                    : item.rank === 2 ? "bg-slate-200 text-slate-600"
                    : "bg-orange-100 text-orange-700"
                    : "bg-slate-100 text-slate-500"
                )}>
                  {item.rank}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {item.title}
                  </div>
                  {item.taskhub_key && (
                    <div className="text-xs text-slate-400 font-mono">{item.taskhub_key}</div>
                  )}
                </div>

                {/* Decision Buttons */}
                <div className="t10-checkout-decisions flex gap-1.5">
                  {DECISION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleDecisionChange(item.id, opt.value)}
                      className={cn(
                        "t10-decision-btn px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 border transition-all",
                        decisions[item.id] === opt.value
                          ? opt.value === 'resolved'
                            ? "t10-decision-btn--resolved t10-decision-btn--active bg-emerald-50 border-emerald-300 text-emerald-700"
                            : opt.value === 'carry'
                            ? "t10-decision-btn--carry t10-decision-btn--active bg-amber-50 border-amber-300 text-amber-700"
                            : "t10-decision-btn--leave t10-decision-btn--active bg-slate-100 border-slate-300 text-slate-600"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {counts.resolved} resolved
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {counts.carry} carry
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              {counts.leave} leave
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-2" />
                  Confirm Checkout
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
