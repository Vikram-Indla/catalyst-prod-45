import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowRight, 
  Check, 
  Lock, 
  Undo2, 
  Pause, 
  Shield, 
  Zap, 
  X 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { canTransition } from '@/services/approvalService';
import {
  WORKFLOW_STATUSES,
  VALID_TRANSITIONS,
  getWorkflowStatus,
  isBackwardTransition,
  requiresApproval,
} from '@/types/workflow';

interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'feature' | 'story';
  entityId: string;
  entityKey: string;
  entityTitle: string;
  currentStatus: string;
  onOpenApprovals: () => void;
  onSuccess?: () => void;
}

interface ApprovalCheck {
  allowed: boolean;
  reason: string;
  pendingCount: number;
  approvedCount: number;
  totalCount: number;
  vetoApproved: boolean;
}

export function TransitionModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityKey,
  entityTitle,
  currentStatus,
  onOpenApprovals,
  onSuccess,
}: TransitionModalProps) {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [approvalChecks, setApprovalChecks] = useState<Record<string, ApprovalCheck>>({});

  const currentStatusInfo = getWorkflowStatus(currentStatus);
  const availableTransitions = VALID_TRANSITIONS[currentStatus] || [];

  // Fetch approval checks for transitions that require approval
  useEffect(() => {
    if (!isOpen) return;
    
    const checkApprovals = async () => {
      const checks: Record<string, ApprovalCheck> = {};
      
      for (const targetStatus of availableTransitions) {
        if (requiresApproval(currentStatus, targetStatus)) {
          try {
            const result = await canTransition(entityType, entityId, currentStatus, targetStatus);
            checks[targetStatus] = result;
          } catch (error) {
            console.error(`Failed to check approval for ${targetStatus}:`, error);
          }
        }
      }
      
      setApprovalChecks(checks);
    };

    checkApprovals();
  }, [isOpen, entityType, entityId, currentStatus, availableTransitions]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStatus(null);
      setComment('');
    }
  }, [isOpen]);

  const transitionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStatus) throw new Error('No status selected');
      
      const table = entityType === 'feature' ? 'features' : 'stories';
      const { error } = await supabase
        .from(table)
        .update({
          status: selectedStatus as any, // Cast to bypass strict enum checking
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      const targetStatusInfo = getWorkflowStatus(selectedStatus!);
      queryClient.invalidateQueries({ queryKey: [entityType === 'feature' ? 'features' : 'stories'] });
      queryClient.invalidateQueries({ queryKey: ['feature', entityId] });
      toast.success(`Transitioned to ${targetStatusInfo?.name || selectedStatus}`);
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to transition');
    },
  });

  const handleSelectStatus = (statusId: string) => {
    const check = approvalChecks[statusId];
    // Only block if there are configured approvers AND they haven't all approved
    if (check && !check.allowed && check.totalCount > 0) {
      return; // Blocked
    }
    setSelectedStatus(statusId);
  };

  const handleTransition = () => {
    if (!selectedStatus) return;
    
    const check = approvalChecks[selectedStatus];
    if (check && !check.allowed && check.totalCount > 0) {
      toast.error('Pending approvals required before transitioning');
      return;
    }
    
    transitionMutation.mutate();
  };

  const selectedStatusInfo = selectedStatus ? getWorkflowStatus(selectedStatus) : null;
  const selectedCheck = selectedStatus ? approvalChecks[selectedStatus] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Transition {entityType === 'feature' ? 'Feature' : 'Story'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-medium">{entityKey}</span> • {entityTitle}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current Status */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground tracking-wider">
              Current Status
            </Label>
            <div 
              className="mt-2 flex items-center gap-3 p-3 rounded-lg border"
              style={{ backgroundColor: currentStatusInfo?.bgColor }}
            >
              <span 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentStatusInfo?.color }}
              />
              <span className="font-medium">{currentStatusInfo?.name || currentStatus}</span>
            </div>
          </div>

          {/* Available Transitions */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground tracking-wider">
              Move To
            </Label>
            <div className="mt-2 space-y-2">
              {availableTransitions.map(targetStatusId => {
                const statusInfo = getWorkflowStatus(targetStatusId);
                const check = approvalChecks[targetStatusId];
                const needsApproval = requiresApproval(currentStatus, targetStatusId);
                const isBlocked = needsApproval && check && !check.allowed && check.totalCount > 0;
                const isSelected = selectedStatus === targetStatusId;
                const isBackward = isBackwardTransition(currentStatus, targetStatusId);
                const isOnHold = targetStatusId === 'on_hold';

                return (
                  <button
                    key={targetStatusId}
                    onClick={() => handleSelectStatus(targetStatusId)}
                    disabled={isBlocked}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      isSelected 
                        ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                        : isBlocked
                          ? 'opacity-50 cursor-not-allowed border-border'
                          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                    }`}
                  >
                    {/* Status indicator */}
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: statusInfo?.color }}
                    />

                    {/* Status info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{statusInfo?.name || targetStatusId}</span>
                        
                        {/* Approval badge */}
                        {needsApproval && check && check.totalCount > 0 && (
                          <Badge 
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 ${
                              check.vetoApproved
                                ? 'border-green-500 text-green-600 bg-green-500/10'
                                : check.allowed
                                  ? 'border-green-500 text-green-600 bg-green-500/10'
                                  : 'border-amber-500 text-amber-600 bg-amber-500/10'
                            }`}
                          >
                            {check.vetoApproved && <Zap className="h-3 w-3 mr-0.5" />}
                            {check.approvedCount}/{check.totalCount}
                          </Badge>
                        )}
                      </div>
                      {statusInfo?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {statusInfo.description}
                        </p>
                      )}
                    </div>

                    {/* Icons */}
                    <div className="flex items-center gap-1">
                      {isBlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                      {isBackward && !isBlocked && <Undo2 className="h-4 w-4 text-muted-foreground" />}
                      {isOnHold && <Pause className="h-4 w-4 text-muted-foreground" />}
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Approval Warning/Success Box */}
          {selectedCheck && selectedCheck.totalCount > 0 && (
            <>
              {selectedCheck.vetoApproved ? (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="p-1 rounded bg-green-500/20">
                    <Zap className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700">Veto Approved</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      A veto approver has approved this transition.
                    </p>
                  </div>
                </div>
              ) : !selectedCheck.allowed ? (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="p-1 rounded bg-amber-500/20">
                    <Shield className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-amber-700">Approval Required</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {selectedCheck.pendingCount} of {selectedCheck.totalCount} approvals pending.{' '}
                      <button
                        onClick={() => {
                          onClose();
                          onOpenApprovals();
                        }}
                        className="text-primary underline hover:no-underline"
                      >
                        Manage approvals
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="p-1 rounded bg-green-500/20">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700">All Approvals Complete</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {selectedCheck.approvedCount} of {selectedCheck.totalCount} approved.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Comment */}
          <div>
            <Label htmlFor="transition-comment">Comment (optional)</Label>
            <Textarea
              id="transition-comment"
              placeholder="Add a note about this transition..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleTransition}
            disabled={
              !selectedStatus || 
              transitionMutation.isPending ||
              (selectedCheck && !selectedCheck.allowed && selectedCheck.totalCount > 0)
            }
            className="bg-primary hover:bg-primary/90"
          >
            {transitionMutation.isPending ? (
              'Moving...'
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Move to {selectedStatusInfo?.name || 'Status'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
