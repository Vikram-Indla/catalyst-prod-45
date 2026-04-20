/**
 * CommitteeModal — Enterprise-grade modal for incident committee decisions
 * 
 * Design: Jira-quality decision workflow
 * - Strong visual hierarchy with clear header
 * - Two-column layout when space allows
 * - Reviewer rows styled like Jira approvers
 * - Token-based colors only (no hex)
 * - Required justification for reject/veto
 * - Compact timeline in Committee Log
 */

import { useState } from 'react';
import { Users, Plus, X, Check, XCircle, AlertTriangle, Search, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { IncidentUserProfile } from '@/types/incident';

interface CommitteeMember {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  avatar_initials?: string;
  has_veto: boolean;
  role?: string;
  vote_status: 'pending' | 'approved' | 'rejected' | 'vetoed';
  voted_at?: string;
  comment?: string;
}

interface CommitteeLogEntry {
  id: string;
  user_name: string;
  action: string;
  status: string;
  justification?: string;
  timestamp: string;
}

interface Committee {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'vetoed';
  members: CommitteeMember[];
}

interface CommitteeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentKey: string;
  committee: Committee | null;
  availableApprovers: IncidentUserProfile[];
  historyLog: CommitteeLogEntry[];
  onAddApprover: (userId: string, hasVeto: boolean, note: string) => Promise<void>;
  onRemoveApprover: (memberId: string) => Promise<void>;
  onVote: (vote: 'approved' | 'rejected', isVeto?: boolean, note?: string) => Promise<void>;
  onCreateCommittee: () => Promise<void>;
  isSubmitting: boolean;
}

// Status badge config - maps to Lozenge appearances
const STATUS_CONFIG: Record<string, { label: string; appearance: LozengeAppearance }> = {
  pending: {
    label: 'Pending',
    appearance: 'moved',
  },
  approved: {
    label: 'Approved',
    appearance: 'success',
  },
  rejected: {
    label: 'Rejected',
    appearance: 'removed',
  },
  vetoed: {
    label: 'Vetoed',
    appearance: 'removed',
  },
};

export function CommitteeModal({
  open,
  onOpenChange,
  incidentKey,
  committee,
  availableApprovers,
  historyLog,
  onAddApprover,
  onRemoveApprover,
  onVote,
  onCreateCommittee,
  isSubmitting,
}: CommitteeModalProps) {
  const [activeTab, setActiveTab] = useState('approvers');
  const [showAddApprover, setShowAddApprover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [hasVeto, setHasVeto] = useState(false);
  const [approverNote, setApproverNote] = useState('');
  const [voteAction, setVoteAction] = useState<'approved' | 'rejected' | 'vetoed' | null>(null);
  const [voteJustification, setVoteJustification] = useState('');

  const members = committee?.members || [];

  const filteredApprovers = availableApprovers.filter(user => {
    const isAlreadyMember = members.some(m => m.user_id === user.id);
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadyMember && matchesSearch;
  });

  const handleAddApprover = async () => {
    if (!selectedUserId) return;
    try {
      await onAddApprover(selectedUserId, hasVeto, approverNote);
      setSelectedUserId('');
      setHasVeto(false);
      setApproverNote('');
      setShowAddApprover(false);
    } catch (error) {
      console.error('Failed to add approver:', error);
    }
  };

  const handleSubmitVote = async () => {
    if (!voteAction) return;
    
    // Require justification for reject/veto
    if ((voteAction === 'rejected' || voteAction === 'vetoed') && !voteJustification.trim()) {
      toast.error('Justification is required when rejecting or vetoing');
      return;
    }

    try {
      await onVote(
        voteAction === 'vetoed' ? 'rejected' : voteAction,
        voteAction === 'vetoed',
        voteJustification || undefined
      );
      setVoteAction(null);
      setVoteJustification('');
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 max-h-[85vh] flex flex-col gap-0">
        {/* Strong header with clear hierarchy */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0 space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Committee — {incidentKey}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Decision workflow for incident approval
              </DialogDescription>
            </div>
          </div>
          {/* Committee status badge in header */}
          {committee && (
            <div className="pt-2">
              <Lozenge appearance={getStatusConfig(committee.status).appearance}>
                {getStatusConfig(committee.status).label}
              </Lozenge>
            </div>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-4 h-9 w-auto self-start shrink-0 bg-muted/50">
            <TabsTrigger value="approvers" className="text-xs h-7 px-4 data-[state=active]:bg-background">
              Approvers
              {members.length > 0 && (
                <span className="ml-2">
                  <Lozenge appearance="inprogress">
                    {members.length}
                  </Lozenge>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="log" className="text-xs h-7 px-4 data-[state=active]:bg-background">
              Activity Log
              {historyLog.length > 0 && (
                <span className="ml-2">
                  <Lozenge appearance="inprogress">
                    {historyLog.length}
                  </Lozenge>
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Approvers Tab */}
          <TabsContent value="approvers" className="flex-1 overflow-hidden m-0 p-5 pt-4">
            <ScrollArea className="h-full">
              <div className="space-y-5 pr-2">
                {/* Approvers List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Reviewers
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setShowAddApprover(!showAddApprover)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Approver
                    </Button>
                  </div>

                  {members.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
                      <User className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No approvers added yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Add reviewers to start the approval workflow</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => {
                        const statusConfig = getStatusConfig(member.vote_status);
                        return (
                          <div 
                            key={member.id} 
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors"
                          >
                            {/* Left: Avatar + Name + Role */}
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-[11px] font-medium bg-primary/10 text-primary">
                                  {member.avatar_initials || member.full_name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {member.full_name}
                                  </span>
                                  {member.has_veto && (
                                    <span className="shrink-0">
                                      <Lozenge appearance="moved">
                                        Veto
                                      </Lozenge>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">Approver</span>
                              </div>
                            </div>
                            
                            {/* Right: Status + Remove */}
                            <div className="flex items-center gap-3 shrink-0">
                              <Lozenge appearance={statusConfig.appearance}>
                                {statusConfig.label}
                              </Lozenge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onRemoveApprover(member.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add Approver Form */}
                {showAddApprover && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Add New Approver</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 text-sm pl-9"
                        />
                      </div>

                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select approver..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredApprovers.length === 0 ? (
                            <div className="p-3 text-xs text-muted-foreground text-center">
                              No matching users found
                            </div>
                          ) : (
                            filteredApprovers.map(user => (
                              <SelectItem key={user.id} value={user.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                      {user.avatar_initials || user.full_name?.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{user.full_name}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasVeto}
                          onChange={(e) => setHasVeto(e.target.checked)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Grant veto power</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => {
                          setShowAddApprover(false);
                          setSelectedUserId('');
                          setSearchQuery('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs px-4"
                        onClick={handleAddApprover}
                        disabled={!selectedUserId || isSubmitting}
                      >
                        Add Approver
                      </Button>
                    </div>
                  </div>
                )}

                {/* Decision Controls */}
                {committee && members.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Your Decision
                    </span>

                    <div className="flex gap-2">
                      <Button
                        variant={voteAction === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'flex-1 h-9 text-xs gap-1.5',
                          voteAction === 'approved' && 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        )}
                        onClick={() => setVoteAction('approved')}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant={voteAction === 'rejected' ? 'destructive' : 'outline'}
                        size="sm"
                        className="flex-1 h-9 text-xs gap-1.5"
                        onClick={() => setVoteAction('rejected')}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        variant={voteAction === 'vetoed' ? 'destructive' : 'outline'}
                        size="sm"
                        className="flex-1 h-9 text-xs gap-1.5"
                        onClick={() => setVoteAction('vetoed')}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Veto
                      </Button>
                    </div>

                    {voteAction && (
                      <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                        <div>
                          <Label className="text-xs font-medium">
                            Justification
                            {(voteAction === 'rejected' || voteAction === 'vetoed') && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {voteAction === 'approved' 
                              ? 'Optional: Add a note for your approval'
                              : 'Required: Explain why you are rejecting/vetoing'
                            }
                          </p>
                        </div>
                        <Textarea
                          value={voteJustification}
                          onChange={(e) => setVoteJustification(e.target.value)}
                          placeholder={`Reason for ${voteAction}...`}
                          className="text-sm min-h-[80px] resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs px-3"
                            onClick={() => {
                              setVoteAction(null);
                              setVoteJustification('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className={cn(
                              'h-8 text-xs px-4',
                              voteAction === 'approved' && 'bg-emerald-600 hover:bg-emerald-700'
                            )}
                            onClick={handleSubmitVote}
                            disabled={isSubmitting}
                          >
                            Submit Decision
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Create Committee Button (if no committee exists) */}
                {!committee && (
                  <div className="pt-4">
                    <Button
                      className="w-full h-10 gap-2"
                      onClick={onCreateCommittee}
                      disabled={isSubmitting}
                    >
                      <Users className="h-4 w-4" />
                      Create Committee
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Committee Log Tab - Compact Timeline */}
          <TabsContent value="log" className="flex-1 overflow-hidden m-0 p-5 pt-4">
            <ScrollArea className="h-full">
              <div className="space-y-1 pr-2">
                {historyLog.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  historyLog.map((entry, index) => {
                    const statusConfig = getStatusConfig(entry.status);
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-start gap-3 py-2.5 px-3 rounded-md hover:bg-muted/30 transition-colors",
                          index !== historyLog.length - 1 && "border-b border-border/50"
                        )}
                      >
                        {/* Timeline dot */}
                        <div className="shrink-0 mt-1.5">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            entry.status === 'approved' && "bg-emerald-500",
                            entry.status === 'rejected' && "bg-rose-500",
                            entry.status === 'vetoed' && "bg-rose-500",
                            entry.status === 'pending' && "bg-muted-foreground/40"
                          )} />
                        </div>
                        
                        {/* Content - single line compact */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {entry.user_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {entry.action}
                            </span>
                            <Lozenge appearance={statusConfig.appearance}>
                              {statusConfig.label}
                            </Lozenge>
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                              {formatDate(entry.timestamp)}
                            </span>
                          </div>
                          {entry.justification && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              "{entry.justification}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
