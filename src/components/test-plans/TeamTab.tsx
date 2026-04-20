import { useState } from 'react';
import { UserPlus, X, Shield, User, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePlanTeam, useAddTeamMember, useRemoveTeamMember } from '@/hooks/useTestPlansG26';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; appearance: LozengeAppearance }> = {
  lead: { label: 'Lead', icon: Shield, appearance: 'default' },
  tester: { label: 'Tester', icon: User, appearance: 'inprogress' },
  reviewer: { label: 'Reviewer', icon: Eye, appearance: 'success' },
};

export function TeamTab({ planId }: { planId: string }) {
  const { data: team } = usePlanTeam(planId);
  const removeMember = useRemoveTeamMember();
  const [showAdd, setShowAdd] = useState(false);

  const { data: allUsers } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name'); if (error) throw error; return data || []; },
  });

  const existingIds = new Set(team?.map(t => t.user_id));
  const available = allUsers?.filter(u => !existingIds.has(u.id)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Team Members ({team?.length || 0})</h3>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}><UserPlus className="h-4 w-4 mr-2" />Add Member</Button>
      </div>
      {team?.length === 0 ? (
        <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">No team members assigned yet</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {team?.map(member => {
            const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.tester;
            return (
              <Card key={member.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarImage src={member.user?.avatar_url || undefined} /><AvatarFallback>{member.user?.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium">{member.user?.full_name}</p>
                        <Lozenge appearance={rc.appearance}>{rc.label}</Lozenge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive" onClick={() => removeMember.mutate({ memberId: member.id, planId })}><X className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <AddMemberModal open={showAdd} onClose={() => setShowAdd(false)} planId={planId} available={available} />
    </div>
  );
}

function AddMemberModal({ open, onClose, planId, available }: { open: boolean; onClose: () => void; planId: string; available: { id: string; full_name: string }[] }) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('tester');
  const addMember = useAddTeamMember();

  const handleAdd = async () => {
    if (!userId) return;
    await addMember.mutateAsync({ planId, userId, role });
    setUserId(''); setRole('tester'); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select a member..." /></SelectTrigger>
            <SelectContent>{available.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="tester">Tester</SelectItem>
              <SelectItem value="reviewer">Reviewer</SelectItem>
            </SelectContent>
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
