// Resolution Modal - For updating ROAM status with reason
// Source: Implementation Spec Section 5.16

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RoamStatus } from "@/types/risks";
import { RoamBadge } from "./RoamBadge";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: RoamStatus;
  newStatus: RoamStatus;
  onConfirm: (reason: string) => void;
}

export function ResolutionModal({
  isOpen,
  onClose,
  currentStatus,
  newStatus,
  onConfirm,
}: ResolutionModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
    onClose();
  };

  const requiresReason = newStatus === 'Resolved' || newStatus === 'Mitigated';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Update Resolution Method</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-xs text-text-muted mb-1 block">Current</Label>
              <RoamBadge status={currentStatus} />
            </div>
            <div className="text-text-muted">→</div>
            <div>
              <Label className="text-xs text-text-muted mb-1 block">New</Label>
              <RoamBadge status={newStatus} />
            </div>
          </div>

          {requiresReason && (
            <div>
              <Label className="text-sm mb-2">
                Resolution Details <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe how this risk was resolved or mitigated..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-text-muted mt-1">
                {newStatus === 'Resolved' 
                  ? 'Explain how the risk was fully resolved'
                  : 'Explain the mitigation steps taken'
                }
              </p>
            </div>
          )}

          {!requiresReason && (
            <div>
              <Label className="text-sm mb-2">Additional Notes (Optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add any notes about this status change..."
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={requiresReason && !reason.trim()}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            Confirm Change
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
