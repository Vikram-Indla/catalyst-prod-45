import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * System Roles Management Page - Configure system-wide roles
 * Source: Administration guide PDF, Page 22
 */
export default function SystemRoles() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Roles</h1>
            <p className="text-muted-foreground mt-2">
              Configure system-wide roles and permissions (Super Admin, Program Manager, etc.)
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Role Configuration</CardTitle>
            <CardDescription>
              Predefined roles: Super Admin, Program Manager, Team Lead, User
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              TODO (needs confirmation): Role list with permissions matrix. Roles: Super Admin (full access), Program Manager (program/portfolio access), Team Lead (team-level access), User (read-only). Permission toggles per entity type (pg 22)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
