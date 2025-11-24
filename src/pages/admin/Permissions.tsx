import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Permissions() {
  const [roleFilter, setRoleFilter] = useState<string>('');

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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permissions</h1>
        <p className="text-muted-foreground">Manage role-based access control</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Permission roles in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles?.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {role.description || '-'}
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

      <div className="flex gap-4">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Roles</SelectItem>
            {roles?.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants?.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell className="font-medium">
                    {grant.permission_roles?.name}
                  </TableCell>
                  <TableCell className="capitalize">{grant.entity_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {grant.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{grant.scope_type}</TableCell>
                  <TableCell>
                    <Checkbox checked={grant.allowed || false} disabled />
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
            No permission grants configured
          </CardContent>
        </Card>
      )}
    </div>
  );
}
