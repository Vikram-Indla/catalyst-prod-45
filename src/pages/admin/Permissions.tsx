import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PermissionRoleDialog } from '@/components/admin/PermissionRoleDialog';
import { PermissionGrantDialog } from '@/components/admin/PermissionGrantDialog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Permissions() {
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedGrant, setSelectedGrant] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'role' | 'grant'; id: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: roles } = useQuery({
    queryKey: ['permission-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_roles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: grants } = useQuery({
    queryKey: ['permission-grants', roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('permission_grants')
        .select('*, permission_roles(name)')
        .order('entity_type');
      
      if (roleFilter) {
        query = query.eq('role_id', roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'role' | 'grant'; id: string }) => {
      const table = type === 'role' ? 'permission_roles' : 'permission_grants';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: variables.type === 'role' ? ['permission-roles'] : ['permission-grants'] 
      });
      toast.success(`${variables.type === 'role' ? 'Role' : 'Grant'} deleted successfully`);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    setRoleDialogOpen(true);
  };

  const handleEditGrant = (grant: any) => {
    setSelectedGrant(grant);
    setGrantDialogOpen(true);
  };

  const handleDeleteConfirm = (type: 'role' | 'grant', id: string) => {
    setDeleteTarget({ type, id });
    setDeleteDialogOpen(true);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">Permissions</h1>
          <p className="text-muted-foreground">Manage role-based access control</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Permission Roles</CardTitle>
              <CardDescription>Define custom roles for your organization</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setSelectedRole(null); setRoleDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles?.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditRole(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteConfirm('role', role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default SAFe Roles</CardTitle>
            <CardDescription>Standard role definitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Portfolio Manager</div>
              <div className="text-sm text-muted-foreground">
                Manages portfolio-level planning and strategy
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium">RTE (Release Train Engineer)</div>
              <div className="text-sm text-muted-foreground">
                Facilitates ART execution and events
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Product Owner</div>
              <div className="text-sm text-muted-foreground">
                Owns and prioritizes team backlog
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Scrum Master</div>
              <div className="text-sm text-muted-foreground">
                Facilitates team processes and removes impediments
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Select value={roleFilter || undefined} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            {roles?.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setSelectedGrant(null); setGrantDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Grant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Grants</CardTitle>
          <CardDescription>Role-based permissions matrix</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Allowed</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants?.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell className="font-medium">
                    {grant.permission_roles?.name}
                  </TableCell>
                  <TableCell className="capitalize">{grant.entity_type.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {grant.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{grant.scope_type}</TableCell>
                  <TableCell>
                    <Checkbox checked={grant.allowed || false} disabled />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditGrant(grant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteConfirm('grant', grant.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(!grants || grants.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No permission grants configured. Click "Add Grant" to create one.
          </CardContent>
        </Card>
      )}

      <PermissionRoleDialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open);
          if (!open) setSelectedRole(null);
        }}
        role={selectedRole}
      />

      <PermissionGrantDialog
        open={grantDialogOpen}
        onOpenChange={(open) => {
          setGrantDialogOpen(open);
          if (!open) setSelectedGrant(null);
        }}
        grant={selectedGrant}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deleteTarget?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
