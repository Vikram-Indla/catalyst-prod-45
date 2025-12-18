import { useState } from 'react';
import { UserPlus, CheckCircle, XCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AddApproverDialog } from './AddApproverDialog';
import type { Incident, IncidentCommittee, CommitteeMember, VoteStatus, IncidentUserProfile } from '@/types/incident';

interface CAPGovernanceSectionProps {
  incident: Incident;
  committee: IncidentCommittee;
  availableApprovers: IncidentUserProfile[];
  isConverted: boolean;
  onAddApprover: (userId: string, hasVeto: boolean, note: string) => void;
  onVote: (memberId: string, vote: VoteStatus, comment: string) => void;
  onUpdateDecisionNote: (note: string) => void;
}

// Vote status icon component
const VoteIcon = ({ vote, size = 'sm' }: { vote: VoteStatus; size?: 'sm' | 'md' }) => {
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  switch (vote) {
    case 'approved':
      return <CheckCircle className={cn(sizeClass, 'text-green-600')} />;
    case 'rejected':
      return <XCircle className={cn(sizeClass, 'text-red-600')} />;
    case 'vetoed':
      return <AlertTriangle className={cn(sizeClass, 'text-orange-600')} />;
    default:
      return <Clock className={cn(sizeClass, 'text-muted-foreground')} />;
  }
};

// Approval Progress Bar
function ApprovalProgressBar({ committee }: { committee: IncidentCommittee }) {
  const members = committee.members || [];
  const approvedCount = members.filter(m => m.vote?.vote === 'approved').length;
  const rejectedCount = members.filter(m => m.vote?.vote === 'rejected').length;
  const vetoedCount = members.filter(m => m.vote?.vote === 'vetoed').length;
  const totalMembers = members.length;
  const requiredApprovals = committee.required_approvals || 1;

  const progressPercent = totalMembers > 0 ? Math.min((approvedCount / requiredApprovals) * 100, 100) : 0;
  const hasVeto = vetoedCount > 0;
  const isRejected = rejectedCount > 0 || hasVeto;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">
          {approvedCount}/{requiredApprovals} approvals
          {totalMembers > requiredApprovals && ` (${totalMembers} total)`}
        </span>
      </div>
      <Progress 
        value={progressPercent} 
        className={cn(
          "h-2",
          hasVeto ? "[&>div]:bg-orange-500" : isRejected ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"
        )}
      />
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-600" />
          {approvedCount} approved
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-red-600" />
          {rejectedCount} rejected
        </span>
        {vetoedCount > 0 && (
          <span className="flex items-center gap-1 text-orange-600 font-medium">
            <AlertTriangle className="h-3 w-3" />
            {vetoedCount} vetoed
          </span>
        )}
      </div>
    </div>
  );
}

// Member Vote Card
function MemberVoteCard({ 
  member, 
  isConverted,
  onVote 
}: { 
  member: CommitteeMember; 
  isConverted: boolean;
  onVote: (memberId: string, vote: VoteStatus, comment: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const vote = member.vote;
  const isPending = !vote?.vote || vote.vote === 'pending';

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      vote?.vote === 'vetoed' ? "border-orange-300 bg-orange-50" :
      vote?.vote === 'rejected' ? "border-red-200 bg-red-50" :
      vote?.vote === 'approved' ? "border-green-200 bg-green-50" :
      "border-border"
    )}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {member.user?.avatar_initials || member.user?.full_name?.charAt(0) || '?'}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{member.user?.full_name}</span>
              {member.has_veto && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-700 border-orange-300 bg-orange-100">
                  VETO
                </Badge>
              )}
            </div>
            {vote?.voted_at && (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(vote.voted_at), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VoteIcon vote={vote?.vote || 'pending'} size="md" />
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border/50">
          {vote?.comment && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-foreground">
              "{vote.comment}"
            </div>
          )}
          {isPending && !isConverted && (
            <div className="mt-3 flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onVote(member.id, 'approved', '')}
                className="flex-1 h-8 text-xs text-green-700 border-green-300 hover:bg-green-50"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onVote(member.id, 'rejected', '')}
                className="flex-1 h-8 text-xs text-red-700 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
              {member.has_veto && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onVote(member.id, 'vetoed', '')}
                  className="flex-1 h-8 text-xs text-orange-700 border-orange-300 hover:bg-orange-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  Veto
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CAPGovernanceSection({
  incident,
  committee,
  availableApprovers,
  isConverted,
  onAddApprover,
  onVote,
  onUpdateDecisionNote,
}: CAPGovernanceSectionProps) {
  const [showAddApprover, setShowAddApprover] = useState(false);
  const [decisionNote, setDecisionNote] = useState(committee.decision_note || '');

  const existingApproverIds = committee.members?.map(m => m.user_id) || [];

  const getStatusConfig = () => {
    switch (committee.status) {
      case 'approved':
        return { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' };
      case 'rejected':
        return { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header Banner */}
        <div className={cn(
          "px-4 py-3 border-b",
          committee.status === 'approved' ? "bg-green-50 border-green-200" :
          committee.status === 'rejected' ? "bg-red-50 border-red-200" :
          "bg-yellow-50 border-yellow-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "h-4 w-4",
                committee.status === 'approved' ? "text-green-600" :
                committee.status === 'rejected' ? "text-red-600" :
                "text-yellow-600"
              )} />
              <span className="text-sm font-medium">CAP Committee Review</span>
            </div>
            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Progress Bar */}
          <ApprovalProgressBar committee={committee} />

          {/* Add Approver Button */}
          {!isConverted && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAddApprover(true)}
              className="w-full h-8 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Add Approver
            </Button>
          )}

          {/* Approver List */}
          {committee.members && committee.members.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Approvers ({committee.members.length})
              </span>
              <div className="space-y-2">
                {committee.members.map((member) => (
                  <MemberVoteCard 
                    key={member.id} 
                    member={member} 
                    isConverted={isConverted}
                    onVote={onVote}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Decision Note */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Decision Note
            </label>
            <Textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              onBlur={() => onUpdateDecisionNote(decisionNote)}
              placeholder="Add notes about the committee decision..."
              className="min-h-[100px] text-sm"
              disabled={isConverted}
            />
          </div>
        </div>
      </div>

      <AddApproverDialog
        open={showAddApprover}
        onOpenChange={setShowAddApprover}
        availableApprovers={availableApprovers}
        existingApproverIds={existingApproverIds}
        onAdd={onAddApprover}
      />
    </>
  );
}
