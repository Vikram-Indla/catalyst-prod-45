import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BulkRoleAssignment } from '@/components/admin/BulkRoleAssignment';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Trash2 } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

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

export default function UserRoles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all user roles
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as any });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      toast({ title: 'Role assigned successfully' });
      setSelectedUserId('');
      setSelectedRole('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to assign role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      toast({ title: 'Role removed successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getUserName = (userId: string) => {
    const profile = profiles?.find((p) => p.id === userId);
    return profile?.full_name || profile?.email || 'Unknown User';
  };

  const handleAssignRole = () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: 'Please select both user and role',
        variant: 'destructive',
      });
      return;
    }

    assignRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
  };

  return (
    <PermissionGuard requiredRole="admin">
      <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Roles</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setBulkDialogOpen(true)} variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Bulk Assignment
          </Button>
          <Shield className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Assign Role Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Assign Role</h2>
        <div className="flex gap-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select user..." />
            </SelectTrigger>
            <SelectContent>
              {profiles?.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleAssignRole}
            disabled={assignRoleMutation.isPending}
          >
            Assign Role
          </Button>
        </div>
      </Card>

      {/* Current Roles Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Current Roles</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading roles...</p>
        ) : userRoles && userRoles.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles.map((userRole) => (
                <TableRow key={userRole.id}>
                  <TableCell className="font-medium">
                    {getUserName(userRole.user_id)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_COLORS[userRole.role as keyof typeof ROLE_COLORS]}>
                      {ROLE_LABELS[userRole.role as keyof typeof ROLE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(userRole.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoleMutation.mutate(userRole.id)}
                      disabled={removeRoleMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No roles assigned yet
          </p>
        )}
      </Card>
    </div>

      <BulkRoleAssignment open={bulkDialogOpen} onOpenChange={setBulkDialogOpen} />
    </PermissionGuard>
  );
}
