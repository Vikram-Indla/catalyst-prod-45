import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Users, Vote, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CAPPolicy {
  id: string;
  approval_mode: string;
  veto_enabled: boolean;
  justification_required: boolean;
}

interface DefaultMember {
  id: string;
  user_id: string;
  role: string | null;
  has_veto: boolean;
  is_active: boolean;
  user?: { display_name: string; email: string };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

export default function IncidentCAPPolicy() {
  const queryClient = useQueryClient();
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberHasVeto, setMemberHasVeto] = useState(false);

  const { data: policy, isLoading: policyLoading } = useQuery({
    queryKey: ['cap-committee-policy'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cap_committee_policy')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as CAPPolicy | null;
    },
  });

  const { data: defaultMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['cap-committee-default-members'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cap_committee_default_members')
        .select('*')
        .order('created_at');

      if (error) throw error;
      return data as DefaultMember[];
    },
  });

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['incident-user-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_user_profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const handlePolicyChange = async (field: string, value: boolean | string) => {
    if (!policy) return;

    try {
      const { error } = await (supabase as any)
        .from('cap_committee_policy')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', policy.id);

      if (error) throw error;
      toast.success('Policy updated');
      queryClient.invalidateQueries({ queryKey: ['cap-committee-policy'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update policy');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    try {
      const { error } = await (supabase as any)
        .from('cap_committee_default_members')
        .insert({
          user_id: selectedUserId,
          role: memberRole || null,
          has_veto: memberHasVeto,
          is_active: true,
        });

      if (error) throw error;
      toast.success('Default member added');
      queryClient.invalidateQueries({ queryKey: ['cap-committee-default-members'] });
      setIsMemberDialogOpen(false);
      setSelectedUserId('');
      setMemberRole('');
      setMemberHasVeto(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('cap_committee_default_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['cap-committee-default-members'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const handleToggleMemberVeto = async (member: DefaultMember) => {
    try {
      const { error } = await (supabase as any)
        .from('cap_committee_default_members')
        .update({ has_veto: !member.has_veto })
        .eq('id', member.id);

      if (error) throw error;
      toast.success(`Veto ${!member.has_veto ? 'enabled' : 'disabled'} for member`);
      queryClient.invalidateQueries({ queryKey: ['cap-committee-default-members'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update member');
    }
  };

  const getUserName = (userId: string) => {
    const user = userProfiles.find((u) => u.id === userId);
    return user?.full_name || user?.email || 'Unknown User';
  };

  const getAvailableUsers = () => {
    const existingUserIds = defaultMembers.map((m) => m.user_id);
    return userProfiles.filter((u) => !existingUserIds.includes(u.id));
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">CAP Committee Policy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the Change Approval Process committee settings
          </p>
        </div>

        {/* Policy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Approval Settings
            </CardTitle>
            <CardDescription>
              Configure how committee approvals are processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {policyLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : policy ? (
              <>
                {/* Approval Mode */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Approval Mode</Label>
                  <RadioGroup
                    value={policy.approval_mode}
                    onValueChange={(value) => handlePolicyChange('approval_mode', value)}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center space-x-3 rounded-lg border p-4">
                      <RadioGroupItem value="majority" id="majority" />
                      <div className="flex-1">
                        <Label htmlFor="majority" className="font-medium cursor-pointer">Majority</Label>
                        <p className="text-sm text-muted-foreground">
                          Approval requires more than 50% of votes in favor
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 rounded-lg border p-4">
                      <RadioGroupItem value="unanimous" id="unanimous" />
                      <div className="flex-1">
                        <Label htmlFor="unanimous" className="font-medium cursor-pointer">Unanimous</Label>
                        <p className="text-sm text-muted-foreground">
                          Approval requires all committee members to vote in favor
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Veto Enabled */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Veto Power</p>
                      <p className="text-sm text-muted-foreground">
                        Allow designated members to block approval with a veto
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={policy.veto_enabled}
                    onCheckedChange={(checked) => handlePolicyChange('veto_enabled', checked)}
                  />
                </div>

                {/* Justification Required */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Justification Required</p>
                      <p className="text-sm text-muted-foreground">
                        Require committee members to provide justification for their vote
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={policy.justification_required}
                    onCheckedChange={(checked) => handlePolicyChange('justification_required', checked)}
                  />
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No policy configuration found</p>
            )}
          </CardContent>
        </Card>

        {/* Default Committee Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Default Committee Members
                </CardTitle>
                <CardDescription>
                  Members automatically added to new CAP committee reviews
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsMemberDialogOpen(true)}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Member</TableHead>
                    <TableHead className="w-[200px]">Role</TableHead>
                    <TableHead className="w-[120px]">Has Veto</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : defaultMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No default committee members configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    defaultMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {getUserName(member.user_id)}
                        </TableCell>
                        <TableCell>
                          {member.role ? (
                            <Badge variant="secondary">{member.role}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={member.has_veto}
                            onCheckedChange={() => handleToggleMemberVeto(member)}
                            disabled={!policy?.veto_enabled}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Member Dialog */}
        <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Default Committee Member</DialogTitle>
              <DialogDescription>
                Select a user to add as a default CAP committee member
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user">User *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableUsers().map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role (optional)</Label>
                <Select value={memberRole} onValueChange={setMemberRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chair">Chair</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="observer">Observer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {policy?.veto_enabled && (
                <div className="flex items-center gap-3">
                  <Switch
                    id="has_veto"
                    checked={memberHasVeto}
                    onCheckedChange={setMemberHasVeto}
                  />
                  <Label htmlFor="has_veto">Has Veto Power</Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
