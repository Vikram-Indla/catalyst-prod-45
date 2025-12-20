/**
 * CommitteeModal — Modal for managing incident committee approvers
 * 
 * Features:
 * - View/add/remove approvers
 * - Vote with justification (required for reject/veto)
 * - Committee log with timestamped entries
 */

import { useState } from 'react';
import { Users, Plus, X, Check, XCircle, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const VOTE_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'default' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  vetoed: { label: 'Vetoed', variant: 'destructive' },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 max-h-[80vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Committee for {incidentKey}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 h-8 w-auto self-start shrink-0">
            <TabsTrigger value="approvers" className="text-xs h-7 px-3">
              Approvers
              {members.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {members.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="log" className="text-xs h-7 px-3">
              Committee Log
            </TabsTrigger>
          </TabsList>

          {/* Approvers Tab */}
          <TabsContent value="approvers" className="flex-1 overflow-hidden m-0 p-4 pt-3">
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-2">
                {/* Committee Status */}
                {committee && (
                  <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 border border-border">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        committee.status === 'approved' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
                        committee.status === 'rejected' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
                        committee.status === 'vetoed' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
                        committee.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
                      )}
                    >
                      {committee.status.charAt(0).toUpperCase() + committee.status.slice(1)}
                    </Badge>
                  </div>
                )}

                {/* Approvers List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Approvers
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowAddApprover(!showAddApprover)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Approver
                    </Button>
                  </div>

                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
                      No approvers added yet
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {members.map((member) => {
                        const statusConfig = VOTE_STATUS_CONFIG[member.vote_status] || VOTE_STATUS_CONFIG.pending;
                        return (
                          <div 
                            key={member.id} 
                            className="flex items-center justify-between p-2 rounded-md border border-border bg-card hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                                  {member.avatar_initials || member.full_name?.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {member.full_name}
                                  </span>
                                  {member.has_veto && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                      Veto
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">Approver</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  'text-[10px] px-1.5 py-0',
                                  statusConfig.variant === 'success' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
                                  statusConfig.variant === 'destructive' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400',
                                  statusConfig.variant === 'default' && 'bg-muted text-muted-foreground',
                                )}
                              >
                                {statusConfig.label}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => onRemoveApprover(member.id)}
                              >
                                <X className="h-3.5 w-3.5" />
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
                  <div className="p-3 rounded-md border border-border bg-muted/30 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 text-sm pl-8"
                      />
                    </div>

                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select approver..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredApprovers.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            No matching users
                          </div>
                        ) : (
                          filteredApprovers.map(user => (
                            <SelectItem key={user.id} value={user.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                                    {user.avatar_initials || user.full_name?.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                {user.full_name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="has-veto"
                        checked={hasVeto}
                        onChange={(e) => setHasVeto(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      <Label htmlFor="has-veto" className="text-xs text-muted-foreground cursor-pointer">
                        Grant veto power
                      </Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
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
                        className="h-7 text-xs"
                        onClick={handleAddApprover}
                        disabled={!selectedUserId || isSubmitting}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {/* Decision Controls */}
                {committee && members.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Your Decision
                    </span>

                    <div className="flex gap-2">
                      <Button
                        variant={voteAction === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'flex-1 h-8 text-xs',
                          voteAction === 'approved' && 'bg-emerald-600 hover:bg-emerald-700'
                        )}
                        onClick={() => setVoteAction('approved')}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant={voteAction === 'rejected' ? 'destructive' : 'outline'}
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => setVoteAction('rejected')}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        variant={voteAction === 'vetoed' ? 'destructive' : 'outline'}
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => setVoteAction('vetoed')}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        Veto
                      </Button>
                    </div>

                    {voteAction && (
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Justification
                          {(voteAction === 'rejected' || voteAction === 'vetoed') && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        <Textarea
                          value={voteJustification}
                          onChange={(e) => setVoteJustification(e.target.value)}
                          placeholder={`Reason for ${voteAction}...`}
                          className="text-sm min-h-[60px] resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setVoteAction(null);
                              setVoteJustification('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
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
                  <div className="pt-3">
                    <Button
                      className="w-full"
                      onClick={onCreateCommittee}
                      disabled={isSubmitting}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Create Committee
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Committee Log Tab */}
          <TabsContent value="log" className="flex-1 overflow-hidden m-0 p-4 pt-3">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-2">
                {historyLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No committee activity yet
                  </p>
                ) : (
                  historyLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-md border border-border bg-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {entry.user_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {entry.action}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {entry.status}
                            </Badge>
                          </div>
                          {entry.justification && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              "{entry.justification}"
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
