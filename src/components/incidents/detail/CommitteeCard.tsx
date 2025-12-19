import { useState } from 'react';
import { Check, X, Users, AlertTriangle, UserPlus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AddApproverDialog } from '../AddApproverDialog';
import type { IncidentUserProfile } from '@/types/incident';

interface CommitteeMember {
  id: string;
  user?: { id: string; full_name: string; avatar_initials?: string; email?: string };
  role?: string;
  has_veto: boolean;
  vote?: { vote: string; voted_at?: string; comment?: string };
}

interface Committee {
  id: string;
  status: string;
  decision_note?: string;
  required_approvals?: number;
  assignment_strategy?: 'manual' | 'round_robin';
  members?: CommitteeMember[];
}

interface CommitteeCardProps {
  committee: Committee | null;
  requiresCommittee: boolean;
  isConverted: boolean;
  availableApprovers: IncidentUserProfile[];
  onVote: (vote: 'approved' | 'rejected', isVeto?: boolean, note?: string) => void;
  onAddApprover: (userId: string, hasVeto: boolean, note: string) => void;
  onInitiateCommittee?: () => void;
  isVotePending: boolean;
}

export function CommitteeCard({
  committee,
  requiresCommittee,
  isConverted,
  availableApprovers,
  onVote,
  onAddApprover,
  onInitiateCommittee,
  isVotePending,
}: CommitteeCardProps) {
  const [decisionNote, setDecisionNote] = useState('');
  const [showAddApprover, setShowAddApprover] = useState(false);

  // No committee and not required
  if (!committee && !requiresCommittee) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Committee Not Required</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          This incident does not require committee approval based on its classification.
        </p>
      </div>
    );
  }

  // Committee required but not yet initiated - allow adding approvers directly
  if (!committee && requiresCommittee) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mb-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Committee Review Required</p>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            This incident requires committee approval before it can be converted.
          </p>
          {!isConverted && (
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button size="sm" onClick={() => setShowAddApprover(true)} className="h-8 text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add First Approver
              </Button>
              {onInitiateCommittee && (
                <Button size="sm" variant="outline" onClick={onInitiateCommittee} className="h-8 text-xs">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Use Default Approvers
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Add Approver Dialog - works even without committee */}
        <AddApproverDialog
          open={showAddApprover}
          onOpenChange={setShowAddApprover}
          availableApprovers={availableApprovers}
          existingApproverIds={[]}
          onAdd={onAddApprover}
        />
      </div>
    );
  }

  // Committee exists - render full UI
  const members = committee?.members || [];
  const totalMembers = members.length;
  const votedMembers = members.filter(m => m.vote?.vote && m.vote.vote !== 'pending');
  const approvedCount = members.filter(m => m.vote?.vote === 'approved').length;
  const rejectedCount = members.filter(m => m.vote?.vote === 'rejected' || m.vote?.vote === 'vetoed').length;
  const requiredApprovals = committee?.required_approvals || Math.ceil(totalMembers / 2);
  const progressPercent = totalMembers > 0 ? (approvedCount / requiredApprovals) * 100 : 0;
  const hasVetoRejection = members.some(m => m.has_veto && m.vote?.vote === 'vetoed');

  const existingApproverIds = members.map(m => m.user?.id).filter(Boolean) as string[];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { 
          label: 'Approved', 
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
        };
      case 'rejected':
        return { 
          label: hasVetoRejection ? 'Vetoed' : 'Rejected', 
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
        };
      default:
        return { 
          label: 'Pending', 
          className: 'bg-violet-100 text-violet-800 dark:bg-violet-950/30 dark:text-violet-400 border-violet-200 dark:border-violet-800' 
        };
    }
  };

  const statusConfig = getStatusConfig(committee?.status || 'pending');

  return (
    <div className="space-y-4">
      {/* Header: Committee + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Committee</h3>
        </div>
        <Badge variant="outline" className={cn('text-xs px-2 py-0.5 font-medium border', statusConfig.className)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Progress Line */}
      <div className="space-y-2">
        <Progress value={Math.min(progressPercent, 100)} className="h-2" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{approvedCount}</span> of{' '}
          <span className="font-medium text-foreground">{totalMembers}</span> approvals
          {requiredApprovals > 0 && (
            <span> · Majority required ({requiredApprovals}+)</span>
          )}
        </p>
      </div>

      {/* Approvers List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Approvers ({totalMembers})
          </span>
          {committee?.status === 'pending' && !isConverted && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={() => setShowAddApprover(true)}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          )}
        </div>
        
        <div className="space-y-1.5">
          {members.map(member => {
            const voteStatus = member.vote?.vote || 'pending';
            const isVeto = member.has_veto && voteStatus === 'vetoed';
            
            return (
              <div 
                key={member.id} 
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-md border border-border bg-background",
                  isVeto && "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {member.user?.avatar_initials || 
                       member.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.user?.full_name || 'Unknown'}</p>
                    {member.has_veto && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Veto Power
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {voteStatus === 'approved' && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                      <Check className="h-3 w-3 mr-0.5" />
                      Approved
                    </Badge>
                  )}
                  {(voteStatus === 'rejected' || voteStatus === 'vetoed') && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                      <X className="h-3 w-3 mr-0.5" />
                      {isVeto ? 'Vetoed' : 'Rejected'}
                    </Badge>
                  )}
                  {voteStatus === 'pending' && (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {members.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No approvers assigned yet.</p>
          )}
        </div>
      </div>

      {/* Decision Note Input */}
      {committee?.status === 'pending' && !isConverted && (
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Decision Note (optional)
          </label>
          <Textarea
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder="Add context for your vote..."
            className="min-h-[60px] text-sm resize-none"
          />
        </div>
      )}

      {/* Approve / Reject Actions */}
      {committee?.status === 'pending' && !isConverted && (
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-9 text-sm hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            onClick={() => onVote('rejected', false, decisionNote)}
            disabled={isVotePending}
          >
            <X className="h-4 w-4 mr-1.5" />
            Reject
          </Button>
          <Button 
            size="sm"
            className="flex-1 h-9 text-sm bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onVote('approved', false, decisionNote)}
            disabled={isVotePending}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Approve
          </Button>
        </div>
      )}

      {/* Veto Helper Text */}
      {committee?.status === 'pending' && members.some(m => m.has_veto) && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
          A veto rejection blocks approval regardless of majority vote.
        </p>
      )}

      {/* Existing Decision Note (if committee resolved) */}
      {committee?.decision_note && committee.status !== 'pending' && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Decision Note</p>
          <p className="text-sm text-foreground">{committee.decision_note}</p>
        </div>
      )}

      {/* Add Approver Dialog */}
      <AddApproverDialog
        open={showAddApprover}
        onOpenChange={setShowAddApprover}
        availableApprovers={availableApprovers}
        existingApproverIds={existingApproverIds}
        onAdd={onAddApprover}
      />
    </div>
  );
}

// Compact summary for right rail
export function CommitteeSummary({ 
  committee, 
  requiresCommittee,
  onClick 
}: { 
  committee: Committee | null; 
  requiresCommittee: boolean;
  onClick?: () => void;
}) {
  if (!committee && !requiresCommittee) return null;

  const members = committee?.members || [];
  const approvedCount = members.filter(m => m.vote?.vote === 'approved').length;
  const totalMembers = members.length;
  const status = committee?.status || 'pending';

  const getStatusInfo = () => {
    if (!committee) return { label: 'Required', variant: 'warning' as const };
    switch (status) {
      case 'approved': return { label: 'Approved', variant: 'success' as const };
      case 'rejected': return { label: 'Rejected', variant: 'destructive' as const };
      default: return { label: `${approvedCount}/${totalMembers}`, variant: 'default' as const };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-2.5 rounded-md border border-border bg-background hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Committee</span>
      </div>
      <Badge 
        variant="outline" 
        className={cn(
          'text-xs px-1.5 py-0 border',
          statusInfo.variant === 'success' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
          statusInfo.variant === 'destructive' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
          statusInfo.variant === 'warning' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
          statusInfo.variant === 'default' && 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800',
        )}
      >
        {statusInfo.label}
      </Badge>
    </button>
  );
}

