import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, ArrowRight, Zap, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  getTransitionApprovals,
  addTransitionApprover,
  removeTransitionApprover,
  respondToApproval,
  setVetoApprover,
  getApprovalConfigs,
} from '@/services/approvalService';
import { ApproverCard } from './ApproverCard';
import { AddApproverModal } from './AddApproverModal';
import { getStatusLabel, getStatusColor } from '@/types/approval';
import type { TransitionApprovalGroup } from '@/types/approval';

interface StatusApprovalsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'feature' | 'story';
  entityId: string;
  entityKey: string;
  entityTitle: string;
  currentStatus: string;
}

export function StatusApprovalsPanel({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityKey,
  entityTitle,
  currentStatus,
}: StatusApprovalsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalContext, setAddModalContext] = useState<{ fromStatus: string; toStatus: string } | null>(null);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Get approval configs
  const { data: configs = [] } = useQuery({
    queryKey: ['approval-configs'],
    queryFn: getApprovalConfigs,
  });

  // Get entity's approvals
  const { data: approvalGroups = [], isLoading } = useQuery({
    queryKey: ['transition-approvals', entityType, entityId],
    queryFn: () => getTransitionApprovals(entityType, entityId),
    enabled: isOpen,
  });

  // Available transitions from configs for this entity type
  const availableTransitions = configs
    .filter(c => c.entity_type === entityType)
    .map(c => ({ from: c.from_status, to: c.to_status }));

  // Combine configured transitions with existing approvals
  const allTransitions = [...new Set([
    ...availableTransitions.map(t => `${t.from}->${t.to}`),
    ...approvalGroups.map(g => `${g.from_status}->${g.to_status}`),
  ])];

  // Set initial selected transition
  React.useEffect(() => {
    if (allTransitions.length > 0 && !selectedTransition) {
      setSelectedTransition(allTransitions[0]);
    }
  }, [allTransitions, selectedTransition]);

  const currentGroup = approvalGroups.find(
    g => `${g.from_status}->${g.to_status}` === selectedTransition
  );

  // Mutations
  const addApproverMutation = useMutation({
    mutationFn: ({ approverId, isVeto, stepOrder, dueDate }: { 
      approverId: string; 
      isVeto: boolean; 
      stepOrder: number; 
      dueDate?: string 
    }) => {
      const [from, to] = addModalContext ? 
        [addModalContext.fromStatus, addModalContext.toStatus] : 
        selectedTransition?.split('->') || [];
      return addTransitionApprover(entityType, entityId, from, to, approverId, {
        isVeto,
        stepOrder,
        dueDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transition-approvals', entityType, entityId] });
      toast.success('Approver added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add approver');
    },
  });

  const removeApproverMutation = useMutation({
    mutationFn: removeTransitionApprover,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transition-approvals', entityType, entityId] });
      toast.success('Approver removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove approver');
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      respondToApproval(id, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['transition-approvals', entityType, entityId] });
      toast.success(action === 'approve' ? 'Approved successfully' : 'Rejected');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to respond');
    },
  });

  const setVetoMutation = useMutation({
    mutationFn: (approverId: string) => {
      const [from, to] = selectedTransition?.split('->') || [];
      return setVetoApprover(entityType, entityId, from, to, approverId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transition-approvals', entityType, entityId] });
      toast.success('Veto power granted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set veto');
    },
  });

  const handleOpenAddModal = (fromStatus: string, toStatus: string) => {
    setAddModalContext({ fromStatus, toStatus });
    setIsAddModalOpen(true);
  };

  const parseTransition = (key: string) => {
    const [from, to] = key.split('->');
    return { from, to };
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-lg">Transition Approvals</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-primary font-medium">{entityKey}</span> • {entityTitle}
                </p>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {allTransitions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No approval configurations for this entity type.</p>
                </div>
              ) : (
                <Tabs value={selectedTransition || ''} onValueChange={setSelectedTransition}>
                  <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
                    {allTransitions.map(key => {
                      const { from, to } = parseTransition(key);
                      const group = approvalGroups.find(g => `${g.from_status}->${g.to_status}` === key);
                      const total = group?.approvers.length || 0;
                      const approved = group?.approved_count || 0;
                      
                      return (
                        <TabsTrigger
                          key={key}
                          value={key}
                          className="text-xs px-3 py-1.5 rounded-full border data-[state=active]:bg-primary/10 data-[state=active]:border-primary"
                        >
                          <span 
                            className="w-2 h-2 rounded-full mr-1.5"
                            style={{ backgroundColor: getStatusColor(from) }}
                          />
                          {getStatusLabel(from)}
                          <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                          <span 
                            className="w-2 h-2 rounded-full mr-1.5"
                            style={{ backgroundColor: getStatusColor(to) }}
                          />
                          {getStatusLabel(to)}
                          {total > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 text-[10px]">
                              {approved}/{total}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {allTransitions.map(key => {
                    const { from, to } = parseTransition(key);
                    const group = approvalGroups.find(g => `${g.from_status}->${g.to_status}` === key);
                    const total = group?.approvers.length || 0;
                    const approved = group?.approved_count || 0;
                    const hasVeto = group?.approvers.some(a => a.is_veto) || false;

                    return (
                      <TabsContent key={key} value={key} className="mt-0 space-y-4">
                        {/* Transition Visual */}
                        <div className="rounded-lg bg-muted/50 p-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getStatusColor(from) }}
                              />
                              <span className="font-medium">{getStatusLabel(from)}</span>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getStatusColor(to) }}
                              />
                              <span className="font-medium">{getStatusLabel(to)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress */}
                        {total > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Approval Progress</span>
                              <span className="font-medium">{approved} of {total} approved</span>
                            </div>
                            <Progress 
                              value={total > 0 ? (approved / total) * 100 : 0} 
                              className="h-2"
                            />
                          </div>
                        )}

                        {/* Veto Info */}
                        {group?.veto_approved && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <Zap className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-700">Veto Power Approved</p>
                              <p className="text-xs text-amber-600 mt-0.5">
                                Transition is approved via veto. Other approvals are overridden.
                              </p>
                            </div>
                          </div>
                        )}

                        {hasVeto && !group?.veto_approved && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-600">Veto Power Active</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                One approver has veto power. Their approval will immediately unlock this transition.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Approvers List */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Approvers</h4>
                          {group?.approvers.length ? (
                            <div className="space-y-2">
                              {group.approvers.map(approver => (
                                <ApproverCard
                                  key={approver.id}
                                  approver={approver}
                                  canRespond={currentUser?.id === approver.approver_id}
                                  onApprove={() => respondMutation.mutate({ id: approver.id, action: 'approve' })}
                                  onReject={() => respondMutation.mutate({ id: approver.id, action: 'reject' })}
                                  onRemove={() => removeApproverMutation.mutate(approver.id)}
                                  onSetVeto={!approver.is_veto ? () => setVetoMutation.mutate(approver.id) : undefined}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                              No approvers configured for this transition.
                            </p>
                          )}
                          
                          {/* Add Approver Button */}
                          <Button
                            variant="outline"
                            className="w-full border-dashed mt-2"
                            onClick={() => handleOpenAddModal(from, to)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Approver
                          </Button>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
            <Button variant="link" className="text-primary p-0 h-auto">
              <History className="h-4 w-4 mr-1" />
              View History
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Approver Modal */}
      {addModalContext && (
        <AddApproverModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setAddModalContext(null);
          }}
          onAdd={(approverId, isVeto, stepOrder, dueDate) => {
            addApproverMutation.mutate({ approverId, isVeto, stepOrder, dueDate });
          }}
          fromStatus={addModalContext.fromStatus}
          toStatus={addModalContext.toStatus}
          existingVeto={currentGroup?.approvers.some(a => a.is_veto) || false}
          existingApproverIds={currentGroup?.approvers.map(a => a.approver_id) || []}
          nextStepOrder={(currentGroup?.approvers.length || 0) + 1}
        />
      )}
    </>
  );
}
