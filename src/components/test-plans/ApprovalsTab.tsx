import { useState } from 'react';
import { Check, X, Clock, UserPlus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlanApprovals, useRequestApproval, useApprove, useReject } from '@/hooks/useTestPlansG26';
import { useAuth } from '@/lib/auth';
import { PlanApproval, PlanStatus } from '@/types/testPlans';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props { planId: string; planStatus: PlanStatus; }

export function ApprovalsTab({ planId, planStatus }: Props) {
  const { user } = useAuth();
  const { data: approvals } = usePlanApprovals(planId);
  const [showAdd, setShowAdd] = useState(false);
  const [decision, setDecision] = useState<{ approval: PlanApproval; action: 'approve' | 'reject' } | null>(null);
  const approve = useApprove();
  const reject = useReject();

  const myApproval = approvals?.find(a => a.approver_id === user?.id && a.status === 'pending');

  const statusBadge = (status: string) => {
    const cfg: Record<string, { label: string; appearance: LozengeAppearance }> = {
      pending: { label: 'Pending', appearance: 'moved' },
      approved: { label: 'Approved', appearance: 'success' },
      rejected: { label: 'Rejected', appearance: 'removed' },
    };
    const c = cfg[status] || cfg.pending;
    return <Lozenge appearance={c.appearance}>{c.label}</Lozenge>;
  };

  return (
    <div className="space-y-6">
      {myApproval && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Your approval is requested</p><p className="text-sm text-muted-foreground">Review this plan and provide your decision</p></div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-red-300 text-red-600" onClick={() => setDecision({ approval: myApproval, action: 'reject' })}><X className="h-4 w-4 mr-2" />Reject</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setDecision({ approval: myApproval, action: 'approve' })}><Check className="h-4 w-4 mr-2" />Approve</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Approvers</h3>
        {planStatus === 'draft' && <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}><UserPlus className="h-4 w-4 mr-2" />Add Approver</Button>}
      </div>
      {approvals?.length === 0 ? (
        <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">No approvers added yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {approvals?.map(a => (
            <Card key={a.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10"><AvatarImage src={a.approver?.avatar_url || undefined} /><AvatarFallback>{a.approver?.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium">{a.approver?.full_name}</p>
                      <p className="text-sm text-muted-foreground">Requested {format(new Date(a.requested_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === 'approved' && <Check className="h-4 w-4 text-green-600" />}
                    {a.status === 'rejected' && <X className="h-4 w-4 text-red-600" />}
                    {a.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                    {statusBadge(a.status)}
                  </div>
                </div>
                {a.comments && (
                  <div className="mt-3 p-3 bg-muted rounded text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1"><MessageSquare className="h-3 w-3" />Comment</div>
                    {a.comments}
                  </div>
                )}
                {a.decided_at && <p className="text-xs text-muted-foreground mt-2">Decided {format(new Date(a.decided_at), 'MMM d, yyyy h:mm a')}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <AddApproverModal open={showAdd} onClose={() => setShowAdd(false)} planId={planId} existing={approvals?.map(a => a.approver_id) || []} />
      {decision && <DecisionModal open={!!decision} onClose={() => setDecision(null)} approval={decision.approval} action={decision.action} planId={planId} />}
    </div>
  );
}

function AddApproverModal({ open, onClose, planId, existing }: { open: boolean; onClose: () => void; planId: string; existing: string[] }) {
  const [userId, setUserId] = useState('');
  const requestApproval = useRequestApproval();
  const { data: users } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name'); if (error) throw error; return data || []; },
  });
  const available = users?.filter(u => !existing.includes(u.id)) || [];

  const handleAdd = async () => {
    if (!userId) return;
    await requestApproval.mutateAsync({ planId, approverId: userId });
    setUserId(''); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Approver</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select a team member..." /></SelectTrigger>
            <SelectContent>{available.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!userId}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DecisionModal({ open, onClose, approval, action, planId }: { open: boolean; onClose: () => void; approval: PlanApproval; action: 'approve' | 'reject'; planId: string }) {
  const [comments, setComments] = useState('');
  const approve = useApprove();
  const reject = useReject();

  const handleSubmit = async () => {
    if (action === 'approve') {
      await approve.mutateAsync({ approvalId: approval.id, planId, comments: comments || undefined });
    } else {
      if (!comments.trim()) { toast.error('Please provide a reason for rejection'); return; }
      await reject.mutateAsync({ approvalId: approval.id, planId, comments });
    }
    setComments(''); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{action === 'approve' ? 'Approve Plan' : 'Reject Plan'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Textarea placeholder={action === 'approve' ? 'Add a comment (optional)...' : 'Reason for rejection (required)...'} value={comments} onChange={e => setComments(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className={action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} onClick={handleSubmit}>{action === 'approve' ? 'Approve' : 'Reject'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
