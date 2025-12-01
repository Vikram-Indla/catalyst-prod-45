import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { ResponsivePageContainer, ResponsivePageHeader } from '@/components/layout/ResponsivePageContainer';

/**
 * Users Management Page - Manage user profiles and system access
 * Source: Administration guide PDF, Page 20
 */
export default function Users() {
  return (
    <AdminGuard>
      <ResponsivePageContainer>
        <ResponsivePageHeader
          title="Users"
          description="Manage user profiles, roles, and system access"
          actions={
            <Button className="bg-brand-gold hover:bg-brand-gold-hover">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>
              View and manage all users in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-[var(--s4)] mb-[var(--s4)]">
              <div className="relative flex-1">
                <Search className="absolute left-[var(--s3)] top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): User table with columns: Name, Email, Role, Teams, Last Login, Status. Bulk actions: Import, Export, Deactivate, Delete (pg 20-21)
            </p>
          </CardContent>
        </Card>
      </ResponsivePageContainer>
    </AdminGuard>
  );
}
