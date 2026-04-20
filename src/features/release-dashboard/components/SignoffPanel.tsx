/**
 * Stakeholder Sign-off Panel Component
 * Module 5B-3: Sign-off workflow UI
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Users,
  UserPlus,
  MoreVertical,
  Trash2,
  Send,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useReleaseSignoffs,
  useRequestSignoff,
  useSubmitSignoff,
  useRemoveSignoff,
} from '../hooks/useSignoff';
import {
  ReleaseSignoff,
  SignoffDecision,
  SIGNOFF_DECISION_CONFIG,
  COMMON_STAKEHOLDER_ROLES,
} from '../types/signoff';

interface SignoffPanelProps {
  releaseId: string;
  currentUserId?: string;
}

// Decision icon component
function DecisionIcon({ decision, className }: { decision: SignoffDecision; className?: string }) {
  const icons = {
    pending: Clock,
    approve: CheckCircle2,
    reject: XCircle,
    abstain: MinusCircle,
  };
  const Icon = icons[decision];
  return <Icon className={className} />;
}

// Individual signoff row
function SignoffRow({
  signoff,
  currentUserId,
  releaseId,
  onSubmitDecision,
  onRemove,
}: {
  signoff: ReleaseSignoff;
  currentUserId?: string;
  releaseId: string;
  onSubmitDecision: (signoff: ReleaseSignoff) => void;
  onRemove: (signoffId: string) => void;
}) {
  const config = SIGNOFF_DECISION_CONFIG[signoff.decision];
  const isCurrentUser = currentUserId === signoff.stakeholderId;
  const canDecide = isCurrentUser && signoff.decision === 'pending';

  const decisionAppearance: LozengeAppearance =
    signoff.decision === 'approve'
      ? 'success'
      : signoff.decision === 'reject'
      ? 'removed'
      : signoff.decision === 'abstain'
      ? 'moved'
      : 'default';
  
  const initials = signoff.stakeholderName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{signoff.stakeholderName}</span>
            {signoff.isRequired && (
              <Lozenge appearance="inprogress">Required</Lozenge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {COMMON_STAKEHOLDER_ROLES.find(r => r.value === signoff.stakeholderRole)?.label || 
             signoff.stakeholderRole}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {signoff.decision !== 'pending' && signoff.decidedAt && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(signoff.decidedAt), { addSuffix: true })}
          </span>
        )}
        
        <Lozenge appearance={decisionAppearance}>
          {config.label}
        </Lozenge>
        
        {canDecide ? (
          <Button 
            size="sm" 
            onClick={() => onSubmitDecision(signoff)}
          >
            Decide
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onRemove(signoff.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export function SignoffPanel({ releaseId, currentUserId }: SignoffPanelProps) {
  const { data: status, isLoading } = useReleaseSignoffs(releaseId);
  const requestSignoff = useRequestSignoff();
  const submitSignoff = useSubmitSignoff();
  const removeSignoff = useRemoveSignoff();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [selectedSignoff, setSelectedSignoff] = useState<ReleaseSignoff | null>(null);
  const [newStakeholderId, setNewStakeholderId] = useState('');
  const [newRole, setNewRole] = useState('');
  const [decision, setDecision] = useState<SignoffDecision>('approve');
  const [comments, setComments] = useState('');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = status?.summary;
  const signoffs = status?.signoffs || [];
  const progressPct = summary && summary.total > 0
    ? ((summary.approved + summary.rejected + summary.abstained) / summary.total) * 100
    : 0;

  const handleSubmitDecision = (signoff: ReleaseSignoff) => {
    setSelectedSignoff(signoff);
    setDecision('approve');
    setComments('');
    setShowDecisionDialog(true);
  };

  const handleConfirmDecision = () => {
    if (!selectedSignoff || !currentUserId) return;
    
    submitSignoff.mutate({
      input: {
        signoffId: selectedSignoff.id,
        stakeholderId: currentUserId,
        decision,
        comments: comments.trim() || undefined,
      },
      releaseId,
    }, {
      onSuccess: () => {
        setShowDecisionDialog(false);
        setSelectedSignoff(null);
      },
    });
  };

  const handleRemove = (signoffId: string) => {
    removeSignoff.mutate({ signoffId, releaseId });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Stakeholder Sign-offs
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          {summary && summary.total > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {summary.approved + summary.rejected + summary.abstained} / {summary.total}
                </span>
              </div>
              <Progress value={progressPct} className="h-2 mb-2" />
              <div className="flex gap-4 text-xs">
                <span className="text-green-600">✓ {summary.approved} approved</span>
                <span className="text-red-600">✕ {summary.rejected} rejected</span>
                <span className="text-slate-500">○ {summary.pending} pending</span>
              </div>
              
              {summary.hasRejections && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  ⚠️ Release has rejections that need to be addressed
                </div>
              )}
              
              {summary.allRequiredApproved && !summary.hasRejections && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  ✓ All required sign-offs approved
                </div>
              )}
            </div>
          )}
          
          {/* Signoff List */}
          {signoffs.length > 0 ? (
            <div>
              {signoffs.map(signoff => (
                <SignoffRow
                  key={signoff.id}
                  signoff={signoff}
                  currentUserId={currentUserId}
                  releaseId={releaseId}
                  onSubmitDecision={handleSubmitDecision}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sign-offs requested</p>
              <p className="text-xs">Add stakeholders to request their approval</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Stakeholder Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Sign-off</DialogTitle>
            <DialogDescription>
              Add a stakeholder to request their sign-off for this release.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Stakeholder ID</label>
              <input
                type="text"
                value={newStakeholderId}
                onChange={(e) => setNewStakeholderId(e.target.value)}
                placeholder="Enter stakeholder user ID"
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_STAKEHOLDER_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                requestSignoff.mutate({
                  releaseId,
                  stakeholderId: newStakeholderId,
                  stakeholderRole: newRole,
                  requestedBy: currentUserId,
                }, {
                  onSuccess: () => {
                    setShowAddDialog(false);
                    setNewStakeholderId('');
                    setNewRole('');
                  },
                });
              }}
              disabled={!newStakeholderId || !newRole || requestSignoff.isPending}
            >
              {requestSignoff.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Send className="h-4 w-4 mr-2" />
              Request Sign-off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision Dialog */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Your Decision</DialogTitle>
            <DialogDescription>
              Review and submit your sign-off decision for this release.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Decision</label>
              <div className="flex gap-2 mt-2">
                {(['approve', 'reject', 'abstain'] as const).map(d => {
                  const cfg = SIGNOFF_DECISION_CONFIG[d];
                  return (
                    <Button
                      key={d}
                      variant={decision === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDecision(d)}
                      className={decision === d ? cfg.bgColor : ''}
                    >
                      <DecisionIcon decision={d} className="h-4 w-4 mr-1" />
                      {cfg.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Comments (Optional)</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments or conditions..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDecision}
              disabled={submitSignoff.isPending}
              className={SIGNOFF_DECISION_CONFIG[decision].bgColor}
            >
              {submitSignoff.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
