// Aqd¹⁰ Checkout Modal
import React, { useState } from 'react';
import { Check, ArrowRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AqdItem, AqdCheckoutDecision } from '@/types/aqd';
import { useCheckoutWeek } from '@/hooks/useAqd';

interface AqdCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekId: string;
  items: AqdItem[];
}

export function AqdCheckoutModal({ isOpen, onClose, weekId, items }: AqdCheckoutModalProps) {
  const [decisions, setDecisions] = useState<Record<string, AqdCheckoutDecision>>({});
  const checkoutWeek = useCheckoutWeek();

  const setDecision = (itemId: string, decision: AqdCheckoutDecision) => {
    setDecisions(prev => ({ ...prev, [itemId]: decision }));
  };

  const reviewedCount = Object.keys(decisions).length;
  const allReviewed = reviewedCount === items.length;

  const handleComplete = async () => {
    if (!allReviewed) return;
    
    const decisionList = Object.entries(decisions).map(([item_id, decision]) => ({
      item_id,
      decision,
    }));

    await checkoutWeek.mutateAsync({ week_id: weekId, decisions: decisionList });
    setDecisions({});
    onClose();
  };

  const handleClose = () => {
    setDecisions({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Weekly Checkout</DialogTitle>
          <DialogDescription>
            Review each priority: Resolved, Carry Forward, or Leave Unresolved
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {items.map(item => {
            const decision = decisions[item.id];
            
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  decision ? "bg-background border-border" : "bg-muted/50 border-transparent"
                )}
              >
                <div className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center text-xs font-bold">
                  {item.rank}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.title}</div>
                  {item.labels.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {item.labels.map(l => l.name).join(', ')}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={decision === 'resolved' ? 'default' : 'outline'}
                    className={cn(
                      "h-7 text-xs gap-1",
                      decision === 'resolved' && "bg-green-600 hover:bg-green-700 border-green-600"
                    )}
                    onClick={() => setDecision(item.id, 'resolved')}
                  >
                    <Check className="h-3 w-3" />
                    Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant={decision === 'carry' ? 'default' : 'outline'}
                    className={cn(
                      "h-7 text-xs gap-1",
                      decision === 'carry' && "bg-blue-600 hover:bg-blue-700 border-blue-600"
                    )}
                    onClick={() => setDecision(item.id, 'carry')}
                  >
                    <ArrowRight className="h-3 w-3" />
                    Carry
                  </Button>
                  <Button
                    size="sm"
                    variant={decision === 'leave' ? 'default' : 'outline'}
                    className={cn(
                      "h-7 text-xs gap-1",
                      decision === 'leave' && "bg-gray-600 hover:bg-gray-700 border-gray-600"
                    )}
                    onClick={() => setDecision(item.id, 'leave')}
                  >
                    <X className="h-3 w-3" />
                    Leave
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        <DialogFooter className="border-t pt-4">
          <div className="flex-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{reviewedCount}</span> of{' '}
            <span className="font-medium text-foreground">{items.length}</span> reviewed
          </div>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!allReviewed || checkoutWeek.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {checkoutWeek.isPending ? 'Completing...' : 'Complete Checkout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
