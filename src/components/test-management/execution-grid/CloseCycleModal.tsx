/**
 * Close Cycle Modal - Close or archive a test cycle
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Archive, CheckCircle2, XCircle, Lock } from 'lucide-react';

interface CloseCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCycle: (reason: 'completed' | 'cancelled', comments?: string, sendNotifications?: boolean, archiveCycle?: boolean) => void;
  cycleName: string;
  executedPercentage: number;
  isLoading?: boolean;
}

export const CloseCycleModal: React.FC<CloseCycleModalProps> = ({
  isOpen,
  onClose,
  onCloseCycle,
  cycleName,
  executedPercentage,
  isLoading = false,
}) => {
  const [reason, setReason] = useState<'completed' | 'cancelled'>('completed');
  const [comments, setComments] = useState('');
  const [sendNotifications, setSendNotifications] = useState(true);
  const [archiveCycle, setArchiveCycle] = useState(false);

  const handleClose = () => {
    onCloseCycle(reason, comments || undefined, sendNotifications, archiveCycle);
    setReason('completed');
    setComments('');
    setSendNotifications(true);
    setArchiveCycle(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand-gold" />
            Close Test Cycle
          </DialogTitle>
          <DialogDescription>
            Closing "{cycleName}" will prevent further execution updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {executedPercentage < 100 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-600">Incomplete Execution</div>
                <div className="text-muted-foreground">
                  Only {executedPercentage}% of test cases have been executed.
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Closure Reason</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as 'completed' | 'cancelled')}>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-brand-gold/50 cursor-pointer">
                <RadioGroupItem value="completed" id="completed" />
                <Label htmlFor="completed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium">Completed</div>
                    <div className="text-xs text-muted-foreground">All planned testing is finished</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-brand-gold/50 cursor-pointer">
                <RadioGroupItem value="cancelled" id="cancelled" />
                <Label htmlFor="cancelled" className="flex items-center gap-2 cursor-pointer flex-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="font-medium">Cancelled</div>
                    <div className="text-xs text-muted-foreground">Testing was stopped before completion</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any closing notes or summary..."
              rows={3}
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify"
                checked={sendNotifications}
                onCheckedChange={(checked) => setSendNotifications(checked === true)}
              />
              <Label htmlFor="notify" className="text-sm font-normal">
                Send email notifications to stakeholders
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="archive"
                checked={archiveCycle}
                onCheckedChange={(checked) => setArchiveCycle(checked === true)}
              />
              <Label htmlFor="archive" className="text-sm font-normal flex items-center gap-1">
                <Archive className="h-3 w-3" />
                Archive this cycle
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleClose}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? 'Closing...' : 'Close Cycle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
