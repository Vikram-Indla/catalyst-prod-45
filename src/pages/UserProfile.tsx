import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { User, Mail, Briefcase, Save, Shield, History } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { formatDistanceToNow } from 'date-fns';

const ROLE_LABELS = {
  admin: 'Admin',
  program_manager: 'Program Manager',
  team_lead: 'Team Lead',
  user: 'User',
};

const ROLE_COLORS = {
  admin: 'destructive',
  program_manager: 'default',
  team_lead: 'secondary',
  user: 'outline',
} as const;

export default function UserProfile() {
  const queryClient = useQueryClient();
  const { role: userAppRole } = useUserRole();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: roleHistory } = useQuery({
    queryKey: ['user-role-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_role_history')
        .select('*, changed_by_profile:profiles!user_role_history_changed_by_fkey(full_name, email)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
      setRole(profile.role || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user found');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          role: role,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">User Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="w-32 h-32">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl">
                {fullName ? getInitials(fullName) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-medium">{fullName || 'No name set'}</p>
              <p className="text-sm text-muted-foreground">{role || 'No role set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">
                  <Briefcase className="w-4 h-4 inline mr-2" />
                  Role
                </Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., Product Owner, Scrum Master, Developer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-sm">{user?.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Account Created</span>
              <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userAppRole ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current Role</p>
                  <Badge variant={ROLE_COLORS[userAppRole as keyof typeof ROLE_COLORS]} className="text-base px-4 py-1">
                    {ROLE_LABELS[userAppRole as keyof typeof ROLE_LABELS]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  This role determines your system-wide permissions and access levels.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No system role assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Role History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roleHistory && roleHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleHistory.map((history: any) => (
                  <TableRow key={history.id}>
                    <TableCell>
                      <Badge variant={ROLE_COLORS[history.role as keyof typeof ROLE_COLORS]}>
                        {ROLE_LABELS[history.role as keyof typeof ROLE_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={history.action === 'assigned' ? 'default' : 'outline'}>
                        {history.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {history.changed_by_profile?.full_name || history.changed_by_profile?.email || 'System'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(history.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {history.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No role history available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
